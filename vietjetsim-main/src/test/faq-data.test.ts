/**
 * Dữ liệu FAQ của `/hoi-dap`.
 *
 * Hai câu hỏi từng bị lặp nguyên văn trong mảng (cùng `id`), nên trang hiển thị
 * chúng hai lần và React báo "Encountered two children with the same key" — đo
 * được trên trình duyệt thật, không phải suy đoán. `key={faq.id}` trùng còn làm
 * một lần bấm mở cả hai bản sao. Test này ghim tính duy nhất của cả `id` lẫn nội
 * dung, và ghim việc mọi `category` đều có tab để không câu nào bị mồ côi.
 */

import { describe, it, expect } from 'vitest';
import { CATEGORIES, FAQ_DATA } from '@/app/hoi-dap/faq-data';

describe('dữ liệu FAQ /hoi-dap', () => {
  it('mỗi câu hỏi có id riêng', () => {
    const ids = FAQ_DATA.map((faq) => faq.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('không có câu hỏi nào bị lặp nội dung', () => {
    const questions = FAQ_DATA.map((faq) => faq.question);
    expect(new Set(questions).size).toBe(questions.length);
  });

  it('câu hỏi nào cũng có câu trả lời', () => {
    for (const faq of FAQ_DATA) {
      expect(faq.question.trim().length, `câu hỏi id ${faq.id}`).toBeGreaterThan(0);
      expect(faq.answer.trim().length, `câu trả lời id ${faq.id}`).toBeGreaterThan(0);
    }
  });

  it('mọi category của FAQ đều có tab lọc', () => {
    for (const faq of FAQ_DATA) {
      expect(CATEGORIES, `category "${faq.category}"`).toContain(faq.category);
    }
  });

  it('tab lọc không trùng nhau', () => {
    expect(new Set(CATEGORIES).size).toBe(CATEGORIES.length);
    expect(CATEGORIES[0]).toBe('Tất cả');
  });
});
