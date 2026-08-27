import { NextRequest, NextResponse } from 'next/server';
import { researchVietjetFlights } from '@/lib/openclaw/flight-researcher';

export async function POST(req: NextRequest) {
  try {
    const { message, history = [] } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // ─── OpenClaw Role Enforcement: COORDINATOR (Real-Time Flight Updates ONLY) ─
    let augmentedHistory = [
      {
        role: 'system',
        content: `Bạn là OpenClaw Coordinator. 
CHỨC NĂNG DUY NHẤT: Điều phối cập nhật chặng bay thực tế từ VietjetAir.com vào cơ sở dữ liệu.
QUY TẮC: 
1. Chỉ trả lời các vấn đề liên quan đến tra cứu chuyến bay thực tế, lộ trình và cập nhật thông tin chuyến bay vào admin dashboard.
2. Từ chối lịch sự mọi câu hỏi về eSIM, gói cước, hoặc hỗ trợ khách hàng chung.
3. Luôn cung cấp link tra cứu từ VietjetAir dựa trên thông tin tra cứu được.`,
      },
      ...history,
    ];

    const lowerMsg = message.toLowerCase();
    const flightKeywords = [
      'chuyến bay',
      'vé máy bay',
      'flight',
      'bay từ',
      'han',
      'sgn',
      'dad',
      'pqc',
      'cxr',
      'hph',
      'vj',
      'cập nhật',
      'route',
    ];

    const isFlightRelated = flightKeywords.some((key) => lowerMsg.includes(key));

    if (isFlightRelated) {
      const origin = lowerMsg.includes('han') || lowerMsg.includes('hà nội') ? 'HAN' : 'SGN';
      const destination = lowerMsg.includes('sgn') || lowerMsg.includes('sài gòn') ? 'SGN' : 'HAN';
      const date = new Date().toISOString().split('T')[0];

      try {
        const research = await researchVietjetFlights(origin, destination, date);
        augmentedHistory.push({
          role: 'system',
          content: `TRẠNG THÁI HIỆN TẠI: Đã tìm thấy lộ trình thực tế ${origin}-${destination} (${date}) tại VietjetAir. Link cập nhật: ${research.bookingUrl}. Hãy hướng dẫn người dùng sử dụng link này để đồng bộ dữ liệu vào hệ thống.`,
        });
      } catch (e) {
        console.error('Coordinator research failed:', e);
      }
    }
    // ─────────────────────────────────────────────────────────────────────────────

    const apiUrl = process.env.NEXT_PUBLIC_OPENCLAW_API_URL || 'http://localhost:18789';
    const apiKey = process.env.OPENCLAW_API_KEY;

    try {
      const response = await fetch(`${apiUrl}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          message,
          context: augmentedHistory,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenClaw API responded with ${response.status}`);
      }

      const data = await response.json();

      return NextResponse.json({
        content:
          data.reply || data.content || data.message || 'Xin lỗi, tôi không thể trả lời lúc này.',
        id: Date.now().toString(),
      });
    } catch (apiError) {
      console.error('OpenClaw API Error:', apiError);

      // Fallback for development (Simulation mode)
      if (process.env.NODE_ENV === 'development') {
        const researchText = isFlightRelated
          ? `[Coordinator Context: Đã trích xuất thông tin lộ trình VietJet thực tế]`
          : '';
        return NextResponse.json({
          content: `${researchText} [Demo Mode] Tôi là OpenClaw Coordinator. Gateway hiện đang ngoại tuyến, nhưng tôi đã sẵn sàng link điều phối cập nhật chặng bay cho bạn.`,
          id: Date.now().toString(),
        });
      }

      throw apiError;
    }
  } catch (error: any) {
    console.error('OpenClaw Route Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
