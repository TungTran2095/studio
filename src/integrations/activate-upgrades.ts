/**
 * Activate Agent Upgrades
 * 
 * File này khởi tạo và kích hoạt tất cả các cải tiến agent khi hệ thống khởi động.
 */

import { AgentSystemUpgrade } from './agent-system-upgrade';
import { Tool } from '@/agent/types';
import { technicalAnalysisTool } from '@/agent/tools/technical-analysis-tool';
import { marketDataTool } from '@/agent/tools/market-data-tool';
import { tradingTool } from '@/agent/tools/trading-tool';
import { balanceCheckTool } from '@/agent/tools/balance-check-tool';

// Các công cụ được tích hợp
const tools = new Map<string, Tool>();
tools.set('technicalAnalysisTool', technicalAnalysisTool);
tools.set('marketDataTool', marketDataTool);
tools.set('tradingTool', tradingTool);
tools.set('balanceCheckTool', balanceCheckTool);

// Biến instance singleton
let upgradeSystem: AgentSystemUpgrade | null = null;

/**
 * Khởi tạo hệ thống nâng cấp agent
 */
export async function initializeAgentUpgrades(config?: any): Promise<AgentSystemUpgrade> {
  console.log(`[activate-upgrades] Đang khởi tạo các cải tiến agent...`);
  
  // Nếu đã khởi tạo, trả về instance đã có
  if (upgradeSystem) {
    console.log(`[activate-upgrades] Hệ thống nâng cấp đã được khởi tạo trước đó`);
    return upgradeSystem;
  }
  
  // Khởi tạo hệ thống nâng cấp với các công cụ
  upgradeSystem = new AgentSystemUpgrade(tools, config);
  
  // Khởi động MCP server nếu được cấu hình
  if (config?.enableMCP !== false) {
    try {
      await upgradeSystem.startMCP(config?.mcpPort || 3001);
    } catch (error: any) {
      console.error(`[activate-upgrades] Lỗi khi khởi động MCP server:`, error);
    }
  }
  
  console.log(`[activate-upgrades] Đã khởi tạo các cải tiến agent thành công`);
  return upgradeSystem;
}

/**
 * Lấy instance hiện tại của hệ thống nâng cấp
 */
export function getAgentUpgradeSystem(): AgentSystemUpgrade | null {
  return upgradeSystem;
}

/**
 * Xử lý truy vấn người dùng thông qua hệ thống nâng cấp
 */
export async function processQueryWithUpgrades(
  message: string,
  context: any
): Promise<{ result: any; tools: string[]; format: string }> {
  // Đảm bảo hệ thống đã được khởi tạo
  if (!upgradeSystem) {
    await initializeAgentUpgrades();
  }
  
  // Xử lý truy vấn
  return upgradeSystem!.processUserQuery(message, context);
}

/**
 * Lấy dữ liệu thị trường thời gian thực
 */
export async function getRealTimeMarketData(symbol: string, interval: string = '1d'): Promise<any> {
  // Đảm bảo hệ thống đã được khởi tạo
  if (!upgradeSystem) {
    await initializeAgentUpgrades();
  }
  
  return upgradeSystem!.getRealTimeMarketData(symbol, interval);
}

/**
 * Đóng hệ thống khi ứng dụng kết thúc
 */
export async function shutdownAgentUpgrades(): Promise<void> {
  if (upgradeSystem) {
    await upgradeSystem.shutdown();
    upgradeSystem = null;
    console.log(`[activate-upgrades] Đã đóng hệ thống nâng cấp agent`);
  }
}