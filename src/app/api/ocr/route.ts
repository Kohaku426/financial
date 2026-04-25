import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const apiKey = process.env.GEMINI_API_KEY?.trim();
        const { image } = await req.json(); // base64 encoded image

        if (!apiKey) {
            return NextResponse.json({ error: "API Key missing" }, { status: 500 });
        }

        const prompt = "Extract transaction details from this receipt image. Return ONLY a JSON object with these keys: amount (number), date (YYYY-MM-DD), item (store name), category (one of: 食費, 日用品, 交通費, 趣味・娯楽, 交際費, 衣服・美容, 家賃・光熱費, その他). No other text.";

        const requestBody = {
            contents: [
                {
                    parts: [
                        { text: prompt },
                        {
                            inline_data: {
                                mime_type: "image/jpeg",
                                data: image.split(',')[1] || image // handle data URL prefix
                            }
                        }
                    ]
                }
            ],
            generationConfig: {
                temperature: 0.1,
                response_mime_type: "application/json"
            }
        };

        const res = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!res.ok) {
            const err = await res.text();
            throw new Error(err);
        }

        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        return NextResponse.json(JSON.parse(text));

    } catch (error: any) {
        console.error("OCR Route Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
