import { describe, it, expect } from 'vitest';
import { getVietjetAiPolicyResponse } from '@/lib/chatbot-ai';

describe('Tác vụ 5.2: Chatbot AI giải đáp chính sách Vietjet Air', () => {
  describe('1. Chính sách Hành lý (Baggage Policy)', () => {
    it('nhận diện và giải đáp quy định hành lý xách tay tiêu chuẩn 7kg', () => {
      const res = getVietjetAiPolicyResponse('Quy định hành lý xách tay là bao nhiêu kg?');
      expect(res.matched).toBe(true);
      expect(res.category).toBe('baggage');
      expect(res.reply).toContain('7kg');
      expect(res.reply).toContain('56cm x 36cm x 23cm');
      expect(res.reply).toContain('Pin sạc dự phòng');
    });

    it('nhận diện và giải đáp quy định hành lý ký gửi và các gói cân nặng', () => {
      const res = getVietjetAiPolicyResponse('Tôi muốn mua thêm hành lý ký gửi 20kg thì thế nào?');
      expect(res.matched).toBe(true);
      expect(res.category).toBe('baggage');
      expect(res.reply).toContain('ký gửi');
      expect(res.reply).toContain('20kg');
    });

    it('giải đáp chính sách mang chất lỏng, nước hoa, mỹ phẩm', () => {
      const res = getVietjetAiPolicyResponse(
        'Có được mang chất lỏng và mỹ phẩm lên máy bay không?'
      );
      expect(res.matched).toBe(true);
      expect(res.category).toBe('baggage');
      expect(res.reply).toContain('chất lỏng');
      expect(res.reply).toContain('100ml');
    });
  });

  describe('2. Thủ tục Giấy tờ bay & Check-in (Travel Documents & Check-in)', () => {
    it('nhận diện quy định CCCD / Hộ chiếu cho người lớn bay nội địa', () => {
      const res = getVietjetAiPolicyResponse('Đi máy bay nội địa cần mang theo giấy tờ CCCD gì?');
      expect(res.matched).toBe(true);
      expect(res.category).toBe('documents');
      expect(res.reply).toContain('CCCD');
      expect(res.reply).toContain('14 tuổi');
    });

    it('giải đáp bắt buộc Giấy khai sinh bản gốc hoặc trích lục có dấu đỏ cho trẻ em dưới 14 tuổi', () => {
      const res = getVietjetAiPolicyResponse(
        'Trẻ em đi máy bay cần giấy khai sinh bản gốc hay bản photo?'
      );
      expect(res.matched).toBe(true);
      expect(res.category).toBe('documents');
      expect(res.reply).toContain('Giấy khai sinh bản chính');
      expect(res.reply).toContain('Bản trích lục');
      expect(res.reply.toLowerCase()).toContain('bản photo');
    });

    it('giải đáp thời gian mở quầy check-in trực tuyến (24h trước giờ bay)', () => {
      const res = getVietjetAiPolicyResponse('Mấy giờ thì bắt đầu mở check-in trực tuyến?');
      expect(res.matched).toBe(true);
      expect(res.category).toBe('documents');
      expect(res.reply).toContain('24 tiếng');
      expect(res.reply).toContain('60 phút');
    });
  });

  describe('3. Điều kiện Hoàn/Hủy vé & Đổi ngày bay (Refund & Cancellation)', () => {
    it('nhận diện điều kiện vé Eco: không hoàn tiền, được đổi ngày có thu phí', () => {
      const res = getVietjetAiPolicyResponse('Vé hạng Eco có được hoàn tiền hoặc hủy vé không?');
      expect(res.matched).toBe(true);
      expect(res.category).toBe('refund');
      expect(res.reply).toContain('Hạng vé Eco');
      expect(res.reply).toContain('Không hỗ trợ hoàn/hủy');
      expect(res.reply).toContain('thay đổi giờ bay');
    });

    it('nhận diện quyền lợi đổi vé miễn phí của hạng Deluxe và SkyBoss', () => {
      const res = getVietjetAiPolicyResponse('Vé Deluxe và SkyBoss đổi ngày bay có mất phí không?');
      expect(res.matched).toBe(true);
      expect(res.category).toBe('refund');
      expect(res.reply).toContain('Deluxe');
      expect(res.reply).toContain('MIỄN PHÍ thay đổi');
      expect(res.reply).toContain('SkyBoss');
      expect(res.reply).toContain('bảo lưu định danh');
    });
  });

  describe('4. Hệ sinh thái SkyJoy (Loyalty & Cash + Points)', () => {
    it('giải đáp về các hạng thẻ SkyJoy và thanh toán Cash + Points', () => {
      const res = getVietjetAiPolicyResponse(
        'Chương trình SkyJoy và thanh toán Cash + Points như thế nào?'
      );
      expect(res.matched).toBe(true);
      expect(res.category).toBe('skyjoy');
      expect(res.reply).toContain('Hạng Red');
      expect(res.reply).toContain('Hạng Silver');
      expect(res.reply).toContain('Hạng Gold');
      expect(res.reply).toContain('Hạng Diamond');
      expect(res.reply).toContain('Cash + Points');
    });
  });

  describe('5. Lời chào và Gợi ý câu hỏi nhanh (Quick Suggestions)', () => {
    it('trả về menu hỗ trợ và gợi ý câu hỏi khi câu hỏi chưa rõ ràng', () => {
      const res = getVietjetAiPolicyResponse('Xin chào trợ lý');
      expect(res.matched).toBe(false);
      expect(res.category).toBe('general');
      expect(res.quickReplies).toBeDefined();
      expect(res.quickReplies!.length).toBeGreaterThan(0);
    });

    it('xử lý chuỗi rỗng an toàn không gây crash', () => {
      const res = getVietjetAiPolicyResponse('');
      expect(res.matched).toBe(false);
      expect(res.reply).toBeDefined();
    });
  });
});
