import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const apiKey = process.env.GEMINI_API_KEY?.trim();
        const { messages, contextData } = await req.json();

        // Fallback dummy response if API key is not configured
        if (!apiKey) {
            const fallbackText = `【※API設定が必要です】\n本当にクラウドAI連携を稼働させるには、Vercelの環境変数またはローカルの '.env.local' に \`GEMINI_API_KEY\` を設定してください。\n\n--- \n現在の連携データからのAIモック分析:\nあなたの現在の総資産は ¥${contextData.totalAssets.toLocaleString()} です。履歴を見たところ、直近の固定費や立替金に改善の余地があるかもしれません。継続的な資産形成のためにクレジットカードの利用明細を見直すことから着手することを推奨いたします。`;
            return NextResponse.json({ response: fallbackText });
        }

        const userMessage = messages[messages.length - 1]?.content || "";

        const systemPrompt = `あなたは優秀で親しみやすいユーザー専属のAIファイナンシャルアドバイザーです。
ユーザーの現在の財務状況データは以下の通りです。このデータを踏まえて具体的なアドバイスを返答してください。

【財務サマリー】
・総資産額: ¥${contextData.totalAssets.toLocaleString()}
・今月の収支概算: ¥${(contextData.currentMonthNet || 0).toLocaleString()}

【支出の傾向】
最近の支出カテゴリ内訳: ${JSON.stringify(contextData.categorizedSpending)}

【重要：CSV解析モード】
もしユーザーが「📎 ... をアップロードしました」といったメッセージと共にCSVデータを提供した場合、以下のJSON形式のみで返答してください。
日本の銀行、クレジットカード、キャッシュレス決済（PayPay, 楽天Pay等）の明細（日付、項目名、金額、備考など）を正確に読み取り、以下の配列形式に変換してください。
[
  { "date": "YYYY-MM-DD", "item": "項目名", "amount": 数値, "type": "income"または"expense", "account": "推測される口座名" }
]
※ 支出（引落しや支払い）は必ず負の数として、収入は正の数として設定してください。
※ PayPay CSVの形式（利用日,利用先名,金額 等）にも対応してください。
※ 余計な文章や説明は一切含めないでください。

通常対話の場合は、プレーンテキストで、親近感のある言葉遣い（〜ですね、〜がおすすめです等）を使用してください。`;

        const requestBody = {
            contents: [
                { role: "user", parts: [{ text: systemPrompt + "\n\nユーザーの質問: " + userMessage }] }
            ],
            generationConfig: {
                temperature: 0.1
            }
        };

        const res = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!res.ok) {
            const errorText = await res.text();
            console.error("Gemini Error:", errorText);

            if (errorText.includes("API_KEY_INVALID") || errorText.includes("API key not valid")) {
                return NextResponse.json({
                    response: "【AI連携エラー】\n設定されたAPIキーが無効です（API Key not valid）。\n\n.env.local ファイル内の `GEMINI_API_KEY` に正しいキーが設定されているか確認してください。文字が欠けていたり、不要な記号が含まれていないかチェックしてください。修正後、Next.jsのサーバーを再起動する必要があります。"
                });
            }

            throw new Error(`Google API Status ${res.status}: ${errorText}`);
        }

        const data = await res.json();
        const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "データの分析に失敗しました。";

        return NextResponse.json({ response: aiResponse });

    } catch (error: any) {
        console.error("AI Route Error:", error);
        return NextResponse.json({ response: "AI処理中にエラーが発生しました: " + error.message }, { status: 500 });
    }
}
