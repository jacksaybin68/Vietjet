import json
import requests

# 1. Cấu hình các tham số và URL kết nối
url = "https://nvidia.com"
stream = False  # Đổi thành True nếu bạn muốn nhận dạng Stream

# 2. Cấu trúc Headers bạn cung cấp
headers = {
    "Authorization": "Bearer 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",
    "Content-Type": "application/json",
    "Accept": "text/event-stream" if stream else "application/json",
}

# 3. Cấu trúc Payload (Dữ liệu yêu cầu gửi đi giống ảnh mẫu của bạn)
payload = {
    "model": "moonshotai/kimi-k3",
    "messages": [
        {
            "role": "user",
            "content": [
                {"type": "text", "text": "What is in this image?"},
                {
                    "type": "image_url",
                    "image_url": {
                        "url": "https://nvidia.com"
                    },
                },
            ],
        }
    ],
    "max_tokens": 16384,
    "stream": stream,
}

# 4. Gửi Request bằng phương thức POST
response = requests.post(url, headers=headers, json=payload, stream=stream)

# 5. Xử lý kết quả trả về
if stream:
    for line in response.iter_lines():
        if line:
            print(line.decode("utf-8"))
else:
    print(json.dumps(response.json(), indent=2, ensure_ascii=False))
