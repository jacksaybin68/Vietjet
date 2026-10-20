import type { Airport } from './AirportPicker';

/**
 * Danh sách toàn bộ 110 sân bay nội địa và quốc tế trong mạng bay Vietjet.
 * Sắp xếp các trung tâm nội địa chính lên đầu, tiếp theo là toàn bộ mạng bay quốc tế.
 */
export const ALL_AIRPORTS: Airport[] = [
  {
    code: 'SGN',
    city: 'Tp. Hồ Chí Minh',
    airport: 'Sân bay Tân Sơn Nhất',
  },
  {
    code: 'HAN',
    city: 'Hà Nội',
    airport: 'Sân bay Nội Bài',
  },
  {
    code: 'DAD',
    city: 'Đà Nẵng',
    airport: 'Sân bay Đà Nẵng',
  },
  {
    code: 'PQC',
    city: 'Phú Quốc',
    airport: 'Sân bay Phú Quốc',
  },
  {
    code: 'CXR',
    city: 'Nha Trang',
    airport: 'Sân bay Cam Ranh',
  },
  {
    code: 'HPH',
    city: 'Hải Phòng',
    airport: 'Sân bay Cát Bi',
  },
  {
    code: 'HUI',
    city: 'Huế',
    airport: 'Sân bay Phú Bài',
  },
  {
    code: 'DLI',
    city: 'Đà Lạt',
    airport: 'Sân bay Liên Khương',
  },
  {
    code: 'VII',
    city: 'Vinh',
    airport: 'Sân bay Quốc tế Vinh',
  },
  {
    code: 'VDO',
    city: 'Hạ Long',
    airport: 'Sân bay Quốc tế Vân Đồn',
  },
  {
    code: 'VCA',
    city: 'Cần Thơ',
    airport: 'Sân bay Trà Nóc',
  },
  {
    code: 'UIH',
    city: 'Quy Nhơn',
    airport: 'Sân bay Phù Cát',
  },
  {
    code: 'BMV',
    city: 'Buôn Ma Thuột',
    airport: 'Sây bay Buôn Ma Thuột',
  },
  {
    code: 'PXU',
    city: 'Pleiku',
    airport: 'Sân bay Pleiku',
  },
  {
    code: 'TBB',
    city: 'Tuy Hòa',
    airport: 'Sân bay Tuy Hoà',
  },
  {
    code: 'VCL',
    city: 'Chu Lai',
    airport: 'Sân bay Chu Lai',
  },
  {
    code: 'THD',
    city: 'Thanh Hoá',
    airport: 'Sân bay Thọ Xuân',
  },
  {
    code: 'VDH',
    city: 'Đồng Hới',
    airport: 'Sân bay Đồng Hới',
  },
  {
    code: 'DIN',
    city: 'Điện Biên',
    airport: 'Sân bay Điện Biên Phủ',
  },
  {
    code: 'VCS',
    city: 'Côn Đảo',
    airport: 'Sân bay Côn Đảo',
  },
  {
    code: 'VKG',
    city: 'Rạch Giá',
    airport: 'Sân bay Rạch Giá',
  },
  {
    code: 'ADL',
    city: 'Adelaide',
    airport: 'Sân bay quốc tế Adelaide',
  },
  {
    code: 'AMD',
    city: 'Ahmedabad',
    airport: 'Sân bay quốc tế Sardar Vallabhbhai Patel',
  },
  {
    code: 'ALA',
    city: 'Almaty',
    airport: 'Sân bay quốc tế Almaty',
  },
  {
    code: 'DPS',
    city: 'Bali',
    airport: 'Sân bay quốc tế Ngurah Rai (Denpasar)',
  },
  {
    code: 'BKK',
    city: 'BangKok',
    airport: 'Sân bay Suvarnabhumi',
  },
  {
    code: 'DMK',
    city: 'Bangkok',
    airport: 'Sân bay Don Mueang',
  },
  {
    code: 'BAV',
    city: 'Bao Đầu',
    airport: 'Sân bay Bao Đầu',
  },
  {
    code: 'BLR',
    city: 'Bengaluru',
    airport: 'Sân bay quốc tế Kempegowda',
  },
  {
    code: 'BNE',
    city: 'Brisbane',
    airport: 'Sân bay quốc tế Brisbane',
  },
  {
    code: 'BFV',
    city: 'Buri Ram',
    airport: 'Buri Ram',
  },
  {
    code: 'PUS',
    city: 'Busan',
    airport: 'Sân bay quốc tế Gimhae',
  },
  {
    code: 'PKX',
    city: 'Bắc Kinh',
    airport: 'Sân bay quốc tế Đại Hưng - Bắc Kinh',
  },
  {
    code: 'KNO',
    city: 'Bắc Sumatra',
    airport: 'Sân bay Quốc tế Kualanamu',
  },
  {
    code: 'KHH',
    city: 'Cao Hùng',
    airport: 'Sân bay quốc tế Cao Hùng',
  },
  {
    code: 'CEB',
    city: 'Cebu',
    airport: 'Sân bay quốc tế Mactan-Cebu',
  },
  {
    code: 'CJJ',
    city: 'Cheong Ju',
    airport: 'Cheong Ju',
  },
  {
    code: 'CNX',
    city: 'Chiang Mai',
    airport: 'Sân bay quốc tế Chiang Mai',
  },
  {
    code: 'CEI',
    city: 'Chiang Rai',
    airport: 'Sân bay quốc tế Chiang Rai',
  },
  {
    code: 'CRK',
    city: 'Clark (Manila)',
    airport: 'Sân bay quốc tế Clark',
  },
  {
    code: 'CMB',
    city: 'Colombo',
    airport: 'Sân bay quốc tế Bandaranaike',
  },
  {
    code: 'DAT',
    city: 'Datong Yungang',
    airport: 'Datong Yungang',
  },
  {
    code: 'FUK',
    city: 'Fukuoka',
    airport: 'Sân bay quốc tế Fukuoka',
  },
  {
    code: 'GAY',
    city: 'Gaya',
    airport: 'Gaya',
  },
  {
    code: 'HDY',
    city: 'Hat Yai',
    airport: 'Sân bay Quốc tế Hat Yai',
  },
  {
    code: 'HIJ',
    city: 'Hiroshima',
    airport: 'Sân bay Hiroshima',
  },
  {
    code: 'CTS',
    city: 'Hokkaido',
    airport: 'Sân bay Chitose mới',
  },
  {
    code: 'HYD',
    city: 'Hyderabad',
    airport: 'Sân bay quốc tế Rajiv Gandhi',
  },
  {
    code: 'HXX',
    city: 'Hà Giang',
    airport: 'Sân bay Hà Giang (không hoạt động)',
  },
  {
    code: 'HGH',
    city: 'Hàng Châu ',
    airport: 'Sân bay quốc tế Tiêu Sơn Hàng Châu',
  },
  {
    code: 'HET',
    city: 'Hô Hòa Hạo Đặc',
    airport: 'Sân bay quốc tế Bạch Tháp Hô Hòa Hạo Đặc',
  },
  {
    code: 'HAK',
    city: 'Hải Khẩu',
    airport: 'Sân bay quốc tế Mỹ Lan Hải Khẩu',
  },
  {
    code: 'HKG',
    city: 'Hồng Kông',
    airport: 'Sân bay quốc tế Hồng Kông',
  },
  {
    code: 'HFE',
    city: 'Hợp Phì',
    airport: 'Sân bay quốc tế Tân Kiều Hợp Phì',
  },
  {
    code: 'CGK',
    city: 'Jakarta',
    airport: 'Sân bay quốc tế Soekarno-Hatta',
  },
  {
    code: 'KKC',
    city: 'Khon Kaen',
    airport: 'Sân bay Khon Kaen',
  },
  {
    code: 'COK',
    city: 'Kochi',
    airport: 'Sân bay quốc tế Cochin',
  },
  {
    code: 'CCU',
    city: 'Kolkata',
    airport: 'Sân bay quốc tế Netaji Subhash Chandra Bose',
  },
  {
    code: 'KBV',
    city: 'Krabi',
    airport: 'Sân bay quốc tế Krabi',
  },
  {
    code: 'KUL',
    city: 'Kuala Lumpur',
    airport: 'Sân bay quốc tế Kuala Lumpur',
  },
  {
    code: 'MFM',
    city: 'Ma Cao',
    airport: 'Sân bay quốc tế Macao',
  },
  {
    code: 'MLE',
    city: 'Maldives',
    airport: 'Sân bay quốc tế Malé (Velana)',
  },
  {
    code: 'MNL',
    city: 'Manila',
    airport: 'Sân bay quốc tế Ninoy Aquino - Nhà ga 1',
  },
  {
    code: 'MEL',
    city: 'Melbourne',
    airport: 'Sân bay quốc tế Melbourne (Tullamarine)',
  },
  {
    code: 'BOM',
    city: 'Mumbai',
    airport: 'Sân bay quốc tế Chhatrapati Shivaji - Nhà ga 2',
  },
  {
    code: 'NGO',
    city: 'Nagoya',
    airport: 'Sân bay quốc tế Chubu (Nagoya) ',
  },
  {
    code: 'NST',
    city: 'Nakhon Si Thammarat',
    airport: 'Sân bay Nakhon Si Thammarat ',
  },
  {
    code: 'UPG',
    city: 'Nam Sulawesi',
    airport: 'Sân bay Quốc tế Sultan Hasanuddin',
  },
  {
    code: 'DEL',
    city: 'New Delhi',
    airport: 'Sân bay quốc tế Indira Gandhi ',
  },
  {
    code: 'YIH',
    city: 'Nghi Xương',
    airport: 'Sân bay quốc tế Tam Hiệp Nghi Xương',
  },
  {
    code: 'INC',
    city: 'Ngân Xuyên',
    airport: 'Sân bay quốc tế Hà Đông Ngân Xuyên',
  },
  {
    code: 'NGB',
    city: 'Ninh Ba',
    airport: 'Sân bay quốc tế Lịch Xã Ninh Ba',
  },
  {
    code: 'OKA',
    city: 'Okinawa',
    airport: 'Sân bay Naha',
  },
  {
    code: 'KIX',
    city: 'Osaka',
    airport: 'Sân bay quốc tế Kansai',
  },
  {
    code: 'PER',
    city: 'Perth',
    airport: 'Sân bay quốc tế Perth',
  },
  {
    code: 'PNH',
    city: 'Phnôm Pênh',
    airport: 'Sân bay quốc tế Phnom Penh',
  },
  {
    code: 'HKT',
    city: 'Phuket',
    airport: 'Sân bay quốc tế Phuket',
  },
  {
    code: 'PRG',
    city: 'Praha',
    airport: 'Sân bay Václav Havel Praha',
  },
  {
    code: 'KWE',
    city: 'Quý Dương',
    airport: 'Sân bay quốc tế Long Động Bảo Quý Dương ',
  },
  {
    code: 'BBU',
    city: 'Quảng Bình',
    airport: 'Sân bay Bãi Bụt (không hoạt động)',
  },
  {
    code: 'CAN',
    city: 'Quảng Châu',
    airport: 'Sân bay quốc tế Bạch Vân Quảng Châu',
  },
  {
    code: 'ICN',
    city: 'Seoul (Incheon)',
    airport: 'Sân bay quốc tế Incheon - Nhà ga 1',
  },
  {
    code: 'FSZ',
    city: 'Shizuoka',
    airport: 'Sân bay Mt. Fuji Shizuoka ',
  },
  {
    code: 'SIN',
    city: 'Singapore',
    airport: 'Sân bay quốc tế Changi',
  },
  {
    code: 'URT',
    city: 'Surat Thani',
    airport: 'Sân bay Surat Thani',
  },
  {
    code: 'WSI',
    city: 'Sydney',
    airport: 'Sân bay Quốc tế Tây Sydney',
  },
  {
    code: 'SYD',
    city: 'Sydney',
    airport: 'Sân bay quốc tế Sydney',
  },
  {
    code: 'KTI',
    city: 'Ta Khmau',
    airport: 'Sân bay quốc tế Techo Takhmao',
  },
  {
    code: 'TFU',
    city: 'Thành Đô',
    airport: 'Sân bay quốc tế Thiên Phủ Thành Đô - Nhà ga T1',
  },
  {
    code: 'CZX',
    city: 'Thường Châu',
    airport: 'Sân bay quốc tế Bôn Ngưu Thường Châu',
  },
  {
    code: 'PVG',
    city: 'Thượng Hải',
    airport: 'Sân bay Quốc tế Phố Đông Thượng Hải ',
  },
  {
    code: 'SJW',
    city: 'Thạch Gia Trang',
    airport: 'Sân bay quốc tế Chính Định Thạch Gia Trang',
  },
  {
    code: 'TRZ',
    city: 'Tiruchirappalli',
    airport: 'Sân bay quốc tế Tiruchirappalli',
  },
  {
    code: 'HND',
    city: 'Tokyo',
    airport: 'Sân bay Haneda - Nhà ga 3',
  },
  {
    code: 'NRT',
    city: 'Tokyo',
    airport: 'Sân bay quốc tế Narita - Nhà ga 2',
  },
  {
    code: 'CKG',
    city: 'Trùng Khánh',
    airport: 'Sân bay quốc tế Giang Bắc Trùng Khánh',
  },
  {
    code: 'CGQ',
    city: 'Trường Xuân',
    airport: 'Sân bay quốc Tế Long Gia Trường Xuân',
  },
  {
    code: 'CGO',
    city: 'Trịnh Châu',
    airport: 'Sân bay quốc tế Tân Chính Trịnh Châu',
  },
  {
    code: 'TUQ',
    city: 'Tuyên Quang',
    airport: 'Sân bay Tuyên Quang (không hoạt động)',
  },
  {
    code: 'XIY',
    city: 'Tây An',
    airport: 'Sân bay quốc tế Hàm Dương Tây An - Nhà ga T5',
  },
  {
    code: 'XUZ',
    city: 'Từ Châu',
    airport: 'Sân bay Quan Âm Từ Châu',
  },
  {
    code: 'UBP',
    city: 'Ubon Ratchathani',
    airport: 'Sân bay Ubon Ratchathani',
  },
  {
    code: 'UTH',
    city: 'Udon Thani',
    airport: 'Sân bay quốc tế Udon Thani',
  },
  {
    code: 'VTE',
    city: 'Viêng Chăn',
    airport: 'Sân bay Quốc tế Wattay',
  },
  {
    code: 'SAI',
    city: 'Xiêm Riệp',
    airport: 'Sân bay quốc tế Xiêm Riệp',
  },
  {
    code: 'RGN',
    city: 'Yangon',
    airport: 'Sân bay quốc tế Yangon (tạm ngừng)',
  },
  {
    code: 'TPE',
    city: 'Đài Bắc',
    airport: 'Sân bay quốc tế Đào viên',
  },
  {
    code: 'TNN',
    city: 'Đài Nam',
    airport: 'Sân bay quốc tế Đài Nam',
  },
  {
    code: 'RMQ',
    city: 'Đài Trung',
    airport: 'Sân bay quốc tế Đài Trung',
  },
  {
    code: 'SUB',
    city: 'Đông Java',
    airport: 'Sân bay Quốc tế Juanda',
  },
];
