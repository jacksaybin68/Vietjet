// Định nghĩa kiểu dữ liệu Deal
// Đảm bảo các component sử dụng Deal được type‑safety.
export interface Deal {
  /** Mã route, ví dụ "HAN → SGN" */
  route: string;
  /** Tên thành phố xuất phát */
  fromCity: string;
  /** Tên thành phố đến */
  toCity: string;
  /** Giá còn lại */
  price: number;
  /** Giá gốc */
  original: number;
  /** Ưu đãi hiện tại (ví dụ "50%") */
  discount: string;
  /** Thời gian có ưu đãi */
  date: string;
  /** Đường dẫn ảnh */
  image: string;
  /** Mô tả thay thế cho ảnh */
  alt: string;
  /** Nhãn “Flash Sale …” */
  badge: string;
  /** Mã sân bay xuất phát */
  from: string;
  /** Mã sân bay đến */
  to: string;
}

// Props cho component DealCard
export interface DealCardProps {
  /** Thông tin deal chi tiết */
  deal: Deal;
}
