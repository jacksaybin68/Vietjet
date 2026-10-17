/**
 * Dữ liệu FAQ của `/hoi-dap`, tách khỏi `page.tsx` để test được.
 *
 * Trước đây mảng này nằm trong page và có hai câu bị lặp nguyên văn (cùng `id`),
 * nên trang hiển thị chúng hai lần và React cảnh báo "Encountered two children
 * with the same key". `key={faq.id}` còn khiến một lần bấm mở cả hai bản sao.
 * `src/test/faq-data.test.ts` ghim id duy nhất và câu hỏi không lặp.
 */

export interface FAQItem {
  id: number;
  category: string;
  question: string;
  answer: string;
}

export const FAQ_DATA: FAQItem[] = [
  {
    id: 1,
    category: 'Chung',
    question: 'Vietjet Air là gì?',
    answer:
      'Vietjet Air là nền tảng đặt vé máy bay trực tuyến chính thức, giúp người dùng trải nghiệm quy trình tìm kiếm, đặt vé, chọn ghế và thanh toán giống như thực tế.',
  },
  {
    id: 2,
    category: 'Đặt vé',
    question: 'Làm thế nào để đặt vé trên Vietjet Air?',
    answer:
      'Bạn chỉ cần truy cập trang chủ, nhập điểm đi, điểm đến, ngày bay và số lượng hành khách. Sau đó chọn chuyến bay phù hợp, điền thông tin hành khách và hoàn tất thanh toán.',
  },
  {
    id: 3,
    category: 'Đặt vé',
    question: 'Tôi có thể đặt vé cho người khác không?',
    answer:
      'Có, bạn có thể đặt vé cho người thân hoặc bạn bè bằng cách điền chính xác thông tin cá nhân của họ (Họ tên, ngày sinh, số CCCD/Hộ chiếu) trong bước điền thông tin hành khách.',
  },
  {
    id: 4,
    category: 'Thanh toán',
    question: 'Vietjet Air chấp nhận những phương thức thanh toán nào?',
    answer:
      'Chúng tôi hỗ trợ thanh toán qua thẻ ATM nội địa, thẻ tín dụng/ghi nợ quốc tế (Visa, Mastercard, JCB), ví điện tử (MoMo, ZaloPay, VNPay) và chuyển khoản ngân hàng.',
  },
  {
    id: 5,
    category: 'Thanh toán',
    question: 'Tôi có thể thanh toán trả góp không?',
    answer:
      'Hiện tại tính năng trả góp đang được áp dụng cho các đơn vé quốc tế và nội địa có giá trị từ 3.000.000 VNĐ trở lên thông qua các đối tác tài chính liên kết.',
  },
  {
    id: 6,
    category: 'Hoàn tiền',
    question: 'Chính sách hoàn vé của Vietjet Air như thế nào?',
    answer:
      'Vé có thể được hoàn tùy theo điều kiện của từng hạng vé. Vé Eco thường không được hoàn, trong khi vé Deluxe và SkyBoss được hoàn với phí xử lý nhất định.',
  },
  {
    id: 7,
    category: 'Hoàn tiền',
    question: 'Thời gian nhận tiền hoàn là bao lâu?',
    answer:
      'Sau khi yêu cầu hoàn vé được phê duyệt, tiền sẽ được hoàn về tài khoản thanh toán ban đầu trong vòng 7-14 ngày làm việc tùy thuộc vào ngân hàng.',
  },
  {
    id: 8,
    category: 'Hành lý',
    question: 'Hành lý ký gửi tối đa được bao nhiêu kg?',
    answer:
      'Bạn có thể mua gói hành lý ký gửi từ 15kg, 20kg, 25kg đến 32kg. Mỗi kiện hành lý không được vượt quá 32kg theo quy định an toàn hàng không.',
  },
  {
    id: 9,
    category: 'Hành lý',
    question: 'Tôi có được mang hành lý xách tay lên máy bay không?',
    answer:
      'Có, mỗi hành khách được mang tối đa 01 kiện hành lý xách tay 7kg và 01 túi xách nhỏ hoặc túi laptop. Tổng trọng lượng không vượt quá 10kg.',
  },
  {
    id: 10,
    category: 'Check-in',
    question: 'Tôi có thể check-in online không?',
    answer:
      'Có, bạn có thể check-in online trên website hoặc ứng dụng từ 24 giờ đến 1 giờ trước giờ bay dự kiến. Sau khi check-in, bạn sẽ nhận được thẻ lên tàu điện tử.',
  },
  {
    id: 11,
    category: 'Đổi vé',
    question: 'Tôi có thể đổi ngày bay sau khi đặt vé không?',
    answer:
      'Bạn có thể đổi ngày bay tùy theo điều kiện hạng vé. Phí đổi vé và chênh lệch giá vé (nếu có) sẽ được áp dụng. Vui lòng liên hệ tổng đài để được hỗ trợ.',
  },
  {
    id: 12,
    category: 'Chung',
    question: 'Làm sao để nhận mã đặt chỗ (PNR)?',
    answer:
      'Mã đặt chỗ (PNR) gồm 6 ký tự sẽ được gửi đến email và số điện thoại của bạn ngay sau khi thanh toán thành công. Bạn cũng có thể xem lại trong mục "Chuyến bay của tôi".',
  },
];

/** Tab lọc: mọi `category` trong `FAQ_DATA` phải có mặt ở đây, nếu không câu hỏi đó không tới được. */
export const CATEGORIES = [
  'Tất cả',
  'Chung',
  'Đặt vé',
  'Thanh toán',
  'Hoàn tiền',
  'Hành lý',
  'Check-in',
  'Đổi vé',
];
