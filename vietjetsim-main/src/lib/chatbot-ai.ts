/**
 * Vietjet AI Policy & Support Chatbot Engine
 *
 * Tự động phân tích câu hỏi người dùng và giải đáp chính xác theo chính sách chính thức:
 * 1. Quy định hành lý (Hành lý xách tay, ký gửi, chất lỏng, pin dự phòng)
 * 2. Thủ tục giấy tờ bay (CCCD/Hộ chiếu, trẻ em dưới 14 tuổi, check-in online)
 * 3. Điều kiện hoàn/hủy/đổi vé (Hạng Eco, Deluxe, SkyBoss, phí chênh lệch)
 */

export interface AiSupportResponse {
  matched: boolean;
  reply: string;
  category?: 'baggage' | 'documents' | 'refund' | 'skyjoy' | 'general';
  quickReplies?: string[];
}

export const AI_POLICY_KNOWLEDGE = {
  baggage: {
    title: 'Quy định Hành lý Vietjet Air',
    handLuggage:
      '🧳 **Hành lý xách tay tiêu chuẩn:**\n' +
      '• Hạng Eco & Deluxe: 01 kiện chính (tối đa 7kg, kích thước ≤ 56cm x 36cm x 23cm) + 01 túi xách nhỏ/túi đựng laptop (≤ 40cm x 30cm x 10cm).\n' +
      '• Hạng SkyBoss / SkyBoss Business: 10kg - 14kg hành lý xách tay theo quy chuẩn cao cấp.\n' +
      '• **Lưu ý đặc biệt:** Pin sạc dự phòng, laptop, thiết bị điện tử PHẢI để trong hành lý xách tay, TUYỆT ĐỐI không để trong hành lý ký gửi.',
    checkedLuggage:
      '📦 **Hành lý ký gửi:**\n' +
      '• Các gói mua trước linh hoạt: 20kg, 30kg, 40kg... Trọng lượng tối đa cho 1 kiện là 32kg, kích thước tối đa 119cm x 119cm x 81cm.\n' +
      '• Vé Deluxe: Đã bao gồm sẵn 20kg hành lý ký gửi (nội địa) hoặc 30kg (quốc tế).\n' +
      '• Vé SkyBoss: Đã bao gồm sẵn 30kg - 50kg hành lý ký gửi tùy chặng.\n' +
      '• **Khuyến nghị:** Mua trước hành lý qua website/ứng dụng tiết kiệm đến 50% chi phí so với mua tại quầy sân bay.',
    liquids:
      '🧴 **Quy định chất lỏng & đồ tươi sống:**\n' +
      '• Chặng nội địa: Cho phép mang chất lỏng không giới hạn dung tích (trừ chất lỏng có cồn nồng độ > 70% hoặc chất dễ cháy nổ).\n' +
      '• Chặng quốc tế: Chất lỏng để trong hành lý xách tay tối đa 100ml/bình chứa, tất cả đặt trong 1 túi nhựa trong suốt có dung tích không quá 1 lít.',
  },

  documents: {
    title: 'Thủ tục Giấy tờ bay & Check-in',
    domestic:
      '📋 **Giấy tờ bay chặng Quốc nội (Nội địa):**\n' +
      '• Hành khách từ đủ 14 tuổi trở lên (quốc tịch Việt Nam): CCCD/CMND còn hạn, Hộ chiếu, Giấy phép lái xe, Giấy xác nhận nhân thân có dán ảnh và dấu giáp lai của công an phường/xã.\n' +
      '• Trẻ em dưới 14 tuổi: BẮT BUỘC mang Giấy khai sinh bản gốc hoặc Bản trích lục khai sinh có công chứng mộc đỏ hợp lệ (KHÔNG chấp nhận bản photo/bản chụp). Trẻ dưới 1 tháng tuổi có thể dùng Giấy chứng sinh.',
    international:
      '🌍 **Giấy tờ bay chặng Quốc tế:**\n' +
      '• Hộ chiếu (Passport) còn hạn sử dụng tối thiểu 06 tháng tính từ ngày nhập cảnh.\n' +
      '• Thị thực (Visa) hoặc Giấy miễn thị thực hợp lệ của quốc gia đến.\n' +
      '• Vé máy bay khứ hồi hoặc vé máy bay đi tiếp quốc gia thứ ba (nếu có yêu cầu).',
    checkin:
      '⏱️ **Thời gian làm thủ tục & Check-in Online:**\n' +
      '• Check-in trực tuyến (Web/App): Mở trước từ 24 tiếng đến 60 phút trước giờ khởi hành dự kiến.\n' +
      '• Quầy làm thủ tục tại sân bay: Mở trước 02 tiếng (nội địa) hoặc 03 tiếng (quốc tế), đóng quầy trước 40 phút (nội địa) hoặc 50 phút (quốc tế) so với giờ khởi hành.',
  },

  refund: {
    title: 'Chính sách Đổi vé, Hoàn tiền & Hủy chuyến',
    eco:
      '🎫 **Hạng vé Eco:**\n' +
      '• Không hỗ trợ hoàn/hủy vé lấy lại tiền mặt.\n' +
      '• Được phép thay đổi giờ bay, ngày bay, hành trình bay: Thu phí thay đổi (theo biểu phí) + chênh lệch giá vé phát sinh (nếu có).\n' +
      '• Thời hạn đổi vé: Phải thực hiện trước giờ khởi hành tối thiểu 03 tiếng.',
    deluxe:
      '🌟 **Hạng vé Deluxe:**\n' +
      '• MIỄN PHÍ thay đổi ngày bay, giờ bay, chành trình (chỉ thu tiền chênh lệch giá vé nếu chuyến mới có giá cao hơn).\n' +
      '• Được hỗ trợ hoàn bảo lưu định danh (Credit Shell) có thời hạn theo quy chế hãng khi không thể thực hiện chuyến bay.',
    skyboss:
      '👑 **Hạng vé SkyBoss & SkyBoss Business:**\n' +
      '• MIỄN PHÍ đổi ngày bay, giờ bay, chặng bay.\n' +
      '• Hỗ trợ hoàn bảo lưu định danh tiền vé với thời hạn lên đến 02 năm kể từ ngày xuất vé.\n' +
      '• Ưu tiên làm thủ tục tại quầy riêng, miễn phí phòng chờ thương gia VIP Lounge, xe đưa đón riêng ra tàu bay.',
  },

  skyjoy: {
    title: 'Hệ sinh thái Khách hàng thân thiết SkyJoy',
    tiers:
      '⭐ **Hệ thống Hạng thẻ & Hệ số tích điểm SkyJoy:**\n' +
      '• **Hạng Red**: Hệ số x1.0 tích lũy cơ bản (0 điểm khởi đầu).\n' +
      '• **Hạng Silver**: Hệ số x1.2 tích lũy điểm thưởng (từ 10,000 SkyPoints trọn đời).\n' +
      '• **Hạng Gold**: Hệ số x1.5 tích lũy điểm thưởng + ưu tiên chọn ghế (từ 50,000 SkyPoints).\n' +
      '• **Hạng Diamond**: Hệ số x2.0 tích lũy tối đa + ưu tiên check-in & hành lý (từ 150,000 SkyPoints).\n' +
      '• **Cơ chế Cash + Points**: Cho phép dùng điểm thưởng SkyPoint kết hợp thanh toán tiền mặt để giảm trực tiếp giá vé máy bay!',
  },
};

/**
 * Phân tích câu hỏi người dùng và trả về nội dung giải đáp tự động chính xác nhất.
 */
export function getVietjetAiPolicyResponse(query: string): AiSupportResponse {
  if (!query || typeof query !== 'string') {
    return {
      matched: false,
      reply: 'Dạ xin lỗi, em chưa hiểu rõ yêu cầu của Quý khách. Quý khách vui lòng nhập lại câu hỏi ạ!',
    };
  }

  const q = query.toLowerCase().trim();

  // 1. Phân loại câu hỏi về Hành lý (Baggage)
  if (
    q.includes('hành lý') ||
    q.includes('hanh ly') ||
    q.includes('xách tay') ||
    q.includes('ký gửi') ||
    q.includes('ky gui') ||
    q.includes('chất lỏng') ||
    q.includes('chat long') ||
    q.includes('pin dự phòng') ||
    q.includes('sạc dự phòng') ||
    q.includes('bao nhiêu kg') ||
    q.includes('mấy kg')
  ) {
    if (q.includes('chất lỏng') || q.includes('chat long') || q.includes('nước hoa') || q.includes('mỹ phẩm')) {
      return {
        matched: true,
        category: 'baggage',
        reply: `${AI_POLICY_KNOWLEDGE.baggage.liquids}\n\nQuý khách có cần hỗ trợ thêm thông tin mua thêm hành lý ký gửi không ạ?`,
        quickReplies: ['Mua thêm hành lý ký gửi', 'Hành lý xách tay 7kg', 'Điều kiện hoàn đổi vé'],
      };
    }

    if (q.includes('ký gửi') || q.includes('ky gui') || q.includes('20kg') || q.includes('30kg')) {
      return {
        matched: true,
        category: 'baggage',
        reply: `${AI_POLICY_KNOWLEDGE.baggage.checkedLuggage}\n\n💡 *Mẹo: Quý khách nên mua trước gói hành lý trên website/app để được mức giá ưu đãi nhất!*`,
        quickReplies: ['Quy định hành lý xách tay', 'Quy định chất lỏng', 'Thủ tục giấy tờ bay'],
      };
    }

    // Tổng quan hành lý xách tay & ký gửi
    return {
      matched: true,
      category: 'baggage',
      reply: `${AI_POLICY_KNOWLEDGE.baggage.handLuggage}\n\n${AI_POLICY_KNOWLEDGE.baggage.checkedLuggage}`,
      quickReplies: ['Quy định chất lỏng & pin', 'Thủ tục giấy tờ bay', 'Điều kiện hoàn đổi vé'],
    };
  }

  // 2. Phân loại câu hỏi về Thủ tục giấy tờ bay & Check-in (Documents & Checkin)
  if (
    q.includes('giấy tờ') ||
    q.includes('giay to') ||
    q.includes('cccd') ||
    q.includes('hộ chiếu') ||
    q.includes('passport') ||
    q.includes('trẻ em') ||
    q.includes('em bé') ||
    q.includes('khai sinh') ||
    q.includes('check-in') ||
    q.includes('checkin') ||
    q.includes('thủ tục') ||
    q.includes('thu tuc') ||
    q.includes('mấy giờ có mặt') ||
    q.includes('đóng quầy')
  ) {
    if (q.includes('trẻ em') || q.includes('em bé') || q.includes('khai sinh')) {
      return {
        matched: true,
        category: 'documents',
        reply:
          '👶 **Quy định giấy tờ cho Trẻ em & Em bé (Dưới 14 tuổi):**\n\n' +
          '• Trẻ em dưới 14 tuổi mang quốc tịch Việt Nam BẮT BUỘC phải có **Giấy khai sinh bản chính** hoặc **Bản trích lục khai sinh có công chứng hợp lệ**.\n' +
          '• Không chấp nhận ảnh chụp điện thoại, bản scan không công chứng hay bản photo thường.\n' +
          '• Trẻ sơ sinh từ 07 ngày tuổi đến dưới 01 tháng tuổi có thể dùng Giấy chứng sinh.\n\n' +
          'Quý khách vui lòng chuẩn bị sẵn sàng bản gốc khi đến quầy thủ tục sân bay.',
        quickReplies: ['Check-in online khi nào mở?', 'Quy định hành lý cho trẻ em', 'Thủ tục bay quốc tế'],
      };
    }

    if (q.includes('checkin') || q.includes('check-in') || q.includes('mấy giờ') || q.includes('thời gian')) {
      return {
        matched: true,
        category: 'documents',
        reply: `${AI_POLICY_KNOWLEDGE.documents.checkin}\n\nQuý khách có thể thực hiện check-in trực tuyến ngay trên thanh menu "Làm thủ tục trực tuyến" của website.`,
        quickReplies: ['Giấy tờ bay nội địa', 'Giấy tờ bay quốc tế', 'Quy định hành lý'],
      };
    }

    return {
      matched: true,
      category: 'documents',
      reply: `${AI_POLICY_KNOWLEDGE.documents.domestic}\n\n${AI_POLICY_KNOWLEDGE.documents.international}\n\n${AI_POLICY_KNOWLEDGE.documents.checkin}`,
      quickReplies: ['Giấy tờ cho trẻ em', 'Thời gian check-in', 'Chính sách hoàn đổi vé'],
    };
  }

  // 3. Phân loại câu hỏi về Hoàn/Hủy vé, Đổi ngày bay (Refund & Cancellation)
  if (
    q.includes('hoàn vé') ||
    q.includes('hoan ve') ||
    q.includes('hủy vé') ||
    q.includes('huy ve') ||
    q.includes('hủy chuyến') ||
    q.includes('đổi vé') ||
    q.includes('doi ve') ||
    q.includes('đổi ngày') ||
    q.includes('doi ngay') ||
    q.includes('đổi giờ') ||
    q.includes('phí đổi') ||
    q.includes('eco') ||
    q.includes('deluxe') ||
    q.includes('skyboss')
  ) {
    return {
      matched: true,
      category: 'refund',
      reply:
        `ℹ️ **Chi tiết điều kiện Hoàn / Hủy / Đổi vé theo từng hạng vé:**\n\n` +
        `${AI_POLICY_KNOWLEDGE.refund.eco}\n\n` +
        `${AI_POLICY_KNOWLEDGE.refund.deluxe}\n\n` +
        `${AI_POLICY_KNOWLEDGE.refund.skyboss}\n\n` +
        `Quý khách có thể vào mục "Chuyến bay của tôi" để tra cứu mã đặt chỗ và thực hiện yêu cầu đổi vé.`,
      quickReplies: ['Phí đổi vé Eco', 'Quyền lợi vé Deluxe', 'Hạng vé SkyBoss'],
    };
  }

  // 4. Phân loại câu hỏi về SkyJoy & SkyPoint (Loyalty)
  if (
    q.includes('skyjoy') ||
    q.includes('skypoint') ||
    q.includes('điểm thưởng') ||
    q.includes('tích điểm') ||
    q.includes('hạng thẻ') ||
    q.includes('cash + points') ||
    q.includes('đổi điểm')
  ) {
    return {
      matched: true,
      category: 'skyjoy',
      reply: `${AI_POLICY_KNOWLEDGE.skyjoy.tiers}\n\nQuý khách có thể vào mục "Tài khoản -> Điểm thưởng SkyJoy" để xem số dư điểm và lịch sử biến động chi tiết!`,
      quickReplies: ['Cách dùng Cash + Points', 'Điều kiện lên hạng Diamond', 'Quy định hành lý'],
    };
  }

  // Trả về câu chào hỗ trợ chung và các gợi ý
  return {
    matched: false,
    category: 'general',
    reply:
      'Dạ chào Quý khách! Em là Trợ lý AI Thông minh của Vietjet Air. Em luôn sẵn sàng giải đáp tự động 24/7 về:\n' +
      '• 🧳 **Chính sách hành lý:** Xách tay 7kg, ký gửi, chất lỏng, pin sạc dự phòng.\n' +
      '• 📋 **Thủ tục giấy tờ bay:** CCCD, hộ chiếu, giấy tờ trẻ em & giờ check-in online.\n' +
      '• 🔄 **Điều kiện vé:** Hoàn/hủy vé, đổi ngày bay các hạng Eco, Deluxe, SkyBoss.\n' +
      '• ⭐ **Ví SkyJoy:** Tích lũy điểm thưởng theo hạng thẻ & thanh toán Cash + Points.\n\n' +
      'Quý khách cần em giải đáp thông tin nào trên đây ạ?',
    quickReplies: [
      'Quy định hành lý xách tay & ký gửi',
      'Giấy tờ bay cho người lớn & trẻ em',
      'Điều kiện hoàn/hủy/đổi vé máy bay',
      'Điểm thưởng SkyJoy & Cash + Points',
    ],
  };
}
