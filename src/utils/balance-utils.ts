/**
 * Các hàm tiện ích để phân tích nội dung tin nhắn liên quan đến số dư
 */

/**
 * Trích xuất mã tài sản từ tin nhắn người dùng
 * 
 * @param message Tin nhắn của người dùng
 * @returns string|undefined Mã tài sản nếu tìm thấy, undefined nếu không
 */
export async function extractAssetSymbolFromMessage(message: string): Promise<string | undefined> {
  // Chuyển tin nhắn về chữ thường và loại bỏ dấu
  const normalizedMessage = message.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  // Các mẫu regex để nhận dạng mã tài sản trong câu hỏi
  const btcPatterns = [
    /\b(btc|bitcoin)\b/i,
    /\bbao\s+nhieu\s+(btc|bitcoin)\b/i,
    /\b(btc|bitcoin)\s+bao\s+nhieu\b/i
  ];
  
  const ethPatterns = [
    /\b(eth|ethereum)\b/i,
    /\bbao\s+nhieu\s+(eth|ethereum)\b/i,
    /\b(eth|ethereum)\s+bao\s+nhieu\b/i
  ];
  
  // Kiểm tra cho BTC
  if (btcPatterns.some(pattern => pattern.test(normalizedMessage))) {
    return 'BTC';
  }
  
  // Kiểm tra cho ETH
  if (ethPatterns.some(pattern => pattern.test(normalizedMessage))) {
    return 'ETH';
  }
  
  // Danh sách các mã tài sản phổ biến khác
  const commonAssets = ['USDT', 'BNB', 'ADA', 'SOL', 'XRP', 'DOGE', 'DOT', 'LINK', 'LTC', 'AVAX'];
  
  // Kiểm tra xem tin nhắn có chứa bất kỳ mã tài sản phổ biến nào không
  for (const asset of commonAssets) {
    const assetPattern = new RegExp(`\\b${asset}\\b`, 'i');
    if (assetPattern.test(message)) {
      return asset;
    }
  }
  
  // Trường hợp người dùng không hỏi về tài sản cụ thể
  return undefined;
}

/**
 * Phân tích tin nhắn để xác định nếu người dùng đang hỏi về số dư tài sản
 * 
 * @param message Tin nhắn của người dùng
 * @returns boolean True nếu người dùng đang hỏi về số dư tài sản
 */
export async function isBalanceQuery(message: string): Promise<boolean> {
  // Chuyển tin nhắn về chữ thường và loại bỏ dấu
  const normalizedMessage = message.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  // Các mẫu câu hỏi về số dư
  const balanceQueries = [
    /bao\s+nhieu/i, // "bao nhiêu"
    /co\s+bao\s+nhieu/i, // "có bao nhiêu"
    /co\s+gi/i, // "có gì"
    /co\s+nhung\s+gi/i, // "có những gì"
    /tai\s+san/i, // "tài sản"
    /so\s+du/i, // "số dư"
    /hien\s+co/i, // "hiện có"
    /dang\s+co/i, // "đang có"
    /bao\s+cao/i, // "báo cáo"
    /report/i // "report"
  ];
  
  // Kiểm tra xem tin nhắn có chứa bất kỳ mẫu câu hỏi nào về số dư không
  return balanceQueries.some(pattern => pattern.test(normalizedMessage));
} 