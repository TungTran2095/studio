/**
 * Hệ thống quản lý mẫu (templates) cho AI Agent
 */
import Handlebars from 'handlebars';
import { getScenarioById } from '../scenarios';
import { renderIchimokuAnalysisTemplate } from './ichimoku_analysis';

// Định nghĩa kiểu dữ liệu input cho template
export interface TemplateInput {
  entities: Record<string, any>;
  toolResults: Record<string, any>;
  context: any;
  message: string;
}

/**
 * Đăng ký các helper cho Handlebars
 */
function registerHelpers() {
  // Helper để định dạng số
  Handlebars.registerHelper('formatNumber', function(value, precision = 2) {
    return Number(value).toLocaleString('vi-VN', {
      minimumFractionDigits: precision,
      maximumFractionDigits: precision
    });
  });
  
  // Helper để định dạng phần trăm
  Handlebars.registerHelper('formatPercent', function(value, precision = 2) {
    const num = Number(value);
    const sign = num >= 0 ? '+' : '';
    return sign + num.toLocaleString('vi-VN', {
      minimumFractionDigits: precision,
      maximumFractionDigits: precision
    }) + '%';
  });
  
  // Helper để định dạng tiền tệ
  Handlebars.registerHelper('formatUSD', function(value, precision = 2) {
    return '$' + Number(value).toLocaleString('vi-VN', {
      minimumFractionDigits: precision,
      maximumFractionDigits: precision
    });
  });
  
  // Helper để hiển thị danh sách
  Handlebars.registerHelper('list', function(items: any[], options) {
    const itemsAsHtml = items.map((item: any) => options.fn(item));
    return itemsAsHtml.join(', ');
  });
  
  // Helper để định dạng thời gian
  Handlebars.registerHelper('formatDate', function(value) {
    if (!value) return '';
    const date = typeof value === 'string' ? new Date(value) : value;
    return date.toLocaleString('vi-VN');
  });
}

// Đăng ký các helper ngay khi import module
registerHelpers();

/**
 * Tạo phản hồi từ mẫu và dữ liệu
 */
export function generateResponseFromTemplate(
  scenarioId: string,
  data: TemplateInput
): string {
  // Xử lý các template đặc biệt
  if (scenarioId === 'ichimoku_analysis') {
    return renderIchimokuAnalysisTemplate(data);
  }
  
  // Lấy kịch bản từ ID
  const scenario = getScenarioById(scenarioId);
  if (!scenario) {
    console.error(`[Templates] Không tìm thấy kịch bản với ID: ${scenarioId}`);
    return 'Xin lỗi, tôi không thể xử lý yêu cầu của bạn vào lúc này.';
  }
  
  try {
    // Biên dịch mẫu
    const template = Handlebars.compile(scenario.responseTemplate);
    
    // Áp dụng dữ liệu vào mẫu
    const result = template(data);
    
    return result;
  } catch (error: any) {
    console.error(`[Templates] Lỗi khi tạo phản hồi từ mẫu:`, error);
    return 'Xin lỗi, tôi gặp vấn đề khi xử lý phản hồi.';
  }
}

/**
 * Kiểm tra xem mẫu có hợp lệ không
 */
export function validateTemplate(template: string): boolean {
  try {
    Handlebars.compile(template);
    return true;
  } catch (error) {
    return false;
  }
} 