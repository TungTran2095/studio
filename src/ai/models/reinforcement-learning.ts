/**
 * Mô hình học tập tăng cường (Reinforcement Learning) cho AI Agent
 * - Học từ kinh nghiệm giao dịch
 * - Tối ưu hóa chiến lược theo thời gian
 * - Thích ứng với điều kiện thị trường thay đổi
 */

import { AgentMemory, ExperienceRecord } from '../memory/agent-memory';

export interface RLModelConfig {
  learningRate: number;
  discountFactor: number;
  explorationRate: number;
  minExplorationRate: number;
  explorationDecayRate: number;
  batchSize: number;
}

export interface State {
  id: string; // ID duy nhất cho state
  features: Record<string, number>; // Các đặc trưng của state dưới dạng số
}

export interface Action {
  type: 'BUY' | 'SELL' | 'HOLD';
  symbol: string;
  amount: number | 'all' | 'half' | 'quarter';
  reason: string;
  timestamp: number;
}

export interface Reward {
  value: number; // Giá trị phần thưởng
  reason: string; // Lý do nhận được phần thưởng này
  timestamp: number; // Thời điểm nhận được phần thưởng
}

export class ReinforcementLearningModel {
  private config: RLModelConfig;
  private memory: AgentMemory;
  private qTable: Map<string, Map<string, number>> = new Map(); // state-action -> q-value
  private stateHistory: { state: State, action: Action, reward: Reward }[] = [];

  constructor(memory: AgentMemory, config?: Partial<RLModelConfig>) {
    this.memory = memory;
    this.config = {
      learningRate: 0.1, // Alpha: tốc độ học
      discountFactor: 0.95, // Gamma: hệ số giảm giá cho phần thưởng tương lai
      explorationRate: 0.3, // Epsilon: tỷ lệ khám phá ban đầu
      minExplorationRate: 0.01, // Epsilon tối thiểu
      explorationDecayRate: 0.01, // Tốc độ giảm epsilon
      batchSize: 32, // Kích thước batch cho học tập
      ...config
    };
  }

  /**
   * Chọn hành động dựa trên trạng thái hiện tại
   */
  public selectAction(state: State): Action {
    // Khám phá (exploration) vs khai thác (exploitation)
    if (Math.random() < this.config.explorationRate) {
      // Khám phá: chọn hành động ngẫu nhiên
      return this.getRandomAction(state);
    } else {
      // Khai thác: chọn hành động tốt nhất dựa trên kinh nghiệm
      return this.getBestAction(state);
    }
  }

  /**
   * Cập nhật mô hình dựa trên kinh nghiệm mới
   */
  public learn(state: State, action: Action, reward: Reward, nextState: State): void {
    const stateKey = this.getStateKey(state);
    const actionKey = this.getActionKey(action);
    const nextStateKey = this.getStateKey(nextState);
    
    // Khởi tạo giá trị Q nếu chưa tồn tại
    if (!this.qTable.has(stateKey)) {
      this.qTable.set(stateKey, new Map());
    }
    
    const stateActions = this.qTable.get(stateKey)!;
    if (!stateActions.has(actionKey)) {
      stateActions.set(actionKey, 0);
    }
    
    // Tính toán giá trị Q mới
    const currentQ = stateActions.get(actionKey)!;
    
    // Tìm hành động tốt nhất cho trạng thái tiếp theo
    const nextBestQ = this.getMaxQValue(nextStateKey);
    
    // Cập nhật giá trị Q theo công thức Q-learning
    // Q(s,a) = Q(s,a) + α * [r + γ * max(Q(s',a')) - Q(s,a)]
    const totalReward = this.calculateTotalReward(reward);
    const newQ = currentQ + this.config.learningRate * (
      totalReward + this.config.discountFactor * nextBestQ - currentQ
    );
    
    // Cập nhật giá trị Q
    stateActions.set(actionKey, newQ);
    
    // Lưu trạng thái vào lịch sử
    this.stateHistory.push({ state, action, reward });
    
    // Giảm tỷ lệ khám phá theo thời gian
    this.updateExplorationRate();
  }

  /**
   * Huấn luyện mô hình từ kinh nghiệm quá khứ
   */
  public trainFromExperiences(): void {
    // Lấy kinh nghiệm từ bộ nhớ
    const experiences = this.memory.getSimilarExperiences('BTC', 'BUY', 100)
      .concat(this.memory.getSimilarExperiences('ETH', 'BUY', 100))
      .concat(this.memory.getSimilarExperiences('BTC', 'SELL', 100))
      .concat(this.memory.getSimilarExperiences('ETH', 'SELL', 100));
    
    // Trộn ngẫu nhiên
    const shuffled = experiences.sort(() => 0.5 - Math.random());
    
    // Chọn batch
    const batch = shuffled.slice(0, this.config.batchSize);
    
    // Huấn luyện trên từng kinh nghiệm
    for (const exp of batch) {
      if (!exp.result) continue; // Bỏ qua nếu chưa có kết quả
      
      // Tạo trạng thái từ metadata (giả định metadata chứa thông tin thị trường)
      if (!exp.metadata?.marketState) continue;
      
      const state = exp.metadata.marketState as State;
      const nextState = exp.metadata.nextMarketState as State;
      
      // Tạo hành động từ kinh nghiệm
      const action: Action = {
        type: exp.action,
        symbol: exp.symbol,
        amount: exp.quantity,
        reason: exp.result.reason || '',
        timestamp: exp.timestamp
      };
      
      // Tạo phần thưởng từ kết quả
      const reward: Reward = {
        value: exp.result.value || 0,
        reason: exp.result.reason || '',
        timestamp: exp.timestamp
      };
      
      // Cập nhật mô hình
      this.learn(state, action, reward, nextState);
    }
  }

  /**
   * Lưu mô hình để sử dụng sau này
   */
  public saveModel(): string {
    const model = {
      qTable: Array.from(this.qTable.entries()).map(([state, actions]) => [
        state,
        Array.from(actions.entries())
      ]),
      config: this.config,
      timestamp: Date.now()
    };
    
    return JSON.stringify(model);
  }

  /**
   * Tải mô hình đã lưu
   */
  public loadModel(serializedModel: string): void {
    try {
      const model = JSON.parse(serializedModel);
      
      // Cập nhật cấu hình
      this.config = { ...this.config, ...model.config };
      
      // Khôi phục Q-table
      this.qTable.clear();
      for (const [stateKey, actionsArray] of model.qTable) {
        const actionsMap = new Map(actionsArray as [string, number][]);
        this.qTable.set(stateKey, actionsMap);
      }
    } catch (error) {
      console.error('Không thể tải mô hình:', error);
    }
  }

  /**
   * Tạo khóa duy nhất cho trạng thái
   */
  private getStateKey(state: State): string {
    return `${state.symbol}_${state.features.rsi}`;
  }

  /**
   * Tạo khóa duy nhất cho hành động
   */
  private getActionKey(action: Action): string {
    return `${action.type}_${action.amount}_${action.reason}_${action.timestamp}`;
  }

  /**
   * Lấy hành động ngẫu nhiên
   */
  private getRandomAction(state: State): Action {
    const actionTypes: Action['type'][] = ['BUY', 'SELL', 'HOLD'];
    const amounts: (number | 'all' | 'half' | 'quarter')[] = ['all', 'half', 'quarter', 0.1, 0.25, 0.5, 1];
    
    return {
      type: actionTypes[Math.floor(Math.random() * actionTypes.length)],
      symbol: state.symbol,
      amount: amounts[Math.floor(Math.random() * amounts.length)],
      reason: '',
      timestamp: Date.now()
    };
  }

  /**
   * Lấy hành động tốt nhất cho trạng thái
   */
  private getBestAction(state: State): Action {
    const stateKey = this.getStateKey(state);
    const stateActions = this.qTable.get(stateKey);
    
    if (!stateActions || stateActions.size === 0) {
      // Nếu chưa có kinh nghiệm, trả về hành động ngẫu nhiên
      return this.getRandomAction(state);
    }
    
    // Tìm hành động có giá trị Q cao nhất
    let bestActionKey = '';
    let bestQValue = -Infinity;
    
    for (const [actionKey, qValue] of stateActions.entries()) {
      if (qValue > bestQValue) {
        bestQValue = qValue;
        bestActionKey = actionKey;
      }
    }
    
    // Nếu không tìm thấy hành động tốt, trả về giữ
    if (bestActionKey === '') {
      return {
        type: 'HOLD',
        symbol: state.symbol,
        amount: 0,
        reason: '',
        timestamp: Date.now()
      };
    }
    
    // Parse hành động từ khóa
    const [type, amount, reason, timestamp] = bestActionKey.split('_');
    
    return {
      type: type as Action['type'],
      symbol: state.symbol,
      amount: this.parseAmount(amount),
      reason: reason,
      timestamp: parseInt(timestamp)
    };
  }

  /**
   * Phân tích kích thước từ chuỗi
   */
  private parseAmount(amountStr: string): number | 'all' | 'half' | 'quarter' {
    if (['all', 'half', 'quarter'].includes(amountStr)) {
      return amountStr as 'all' | 'half' | 'quarter';
    }
    return parseFloat(amountStr);
  }

  /**
   * Lấy giá trị Q cao nhất cho trạng thái
   */
  private getMaxQValue(stateKey: string): number {
    const stateActions = this.qTable.get(stateKey);
    
    if (!stateActions || stateActions.size === 0) {
      return 0;
    }
    
    let maxQ = -Infinity;
    for (const qValue of stateActions.values()) {
      if (qValue > maxQ) {
        maxQ = qValue;
      }
    }
    
    return maxQ;
  }

  /**
   * Tính toán tổng phần thưởng từ các thành phần
   */
  private calculateTotalReward(reward: Reward): number {
    // Có thể điều chỉnh trọng số tùy theo mục tiêu
    const valueWeight = 0.7;
    const reasonWeight = 0.2;
    const timestampWeight = 0.1;
    
    return (
      reward.value * valueWeight +
      reward.reason.length * reasonWeight -
      reward.timestamp * timestampWeight
    );
  }

  /**
   * Cập nhật tỷ lệ khám phá
   */
  private updateExplorationRate(): void {
    this.config.explorationRate = Math.max(
      this.config.minExplorationRate,
      this.config.explorationRate * (1 - this.config.explorationDecayRate)
    );
  }
} 