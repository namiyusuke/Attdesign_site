import type { APIRoute } from "astro";
import { Resend } from "resend";

// SSRモードを有効化（静的生成を無効化）
export const prerender = false;

// フォームデータの型定
interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

// バリデーション関数
function validateFormData(data: ContactFormData): string[] {
  const errors: string[] = [];

  if (!data.name || data.name.trim().length < 2) {
    errors.push("名前は2文字以上で入力してください");
  }

  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push("有効なメールアドレスを入力してください");
  }

  if (!data.subject || data.subject.trim().length < 3) {
    errors.push("件名は3文字以上で入力してください");
  }

  if (!data.message || data.message.trim().length < 10) {
    errors.push("メッセージは10文字以上で入力してください");
  }

  return errors;
}

// XSS対策: HTMLエスケープ
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export const POST: APIRoute = async ({ request }) => {
  try {
    // リクエストボディをJSONとして取得
    const body = await request.json();

    const data: ContactFormData = {
      name: body.name || "",
      email: body.email || "",
      subject: body.subject || "",
      message: body.message || "",
    };

    // バリデーション
    const errors = validateFormData(data);
    if (errors.length > 0) {
      return new Response(JSON.stringify({ success: false, errors }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Resend APIキーを設定
    const apiKey = import.meta.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error("RESEND_API_KEY is not set");
      return new Response(JSON.stringify({ success: false, errors: ["サーバー設定エラー"] }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const resend = new Resend(apiKey);

    // メール送信
    const { error } = await resend.emails.send({
      from: import.meta.env.CONTACT_FROM_EMAIL || "onboarding@resend.dev",
      to: import.meta.env.CONTACT_TO_EMAIL,
      subject: `【お問い合わせ】${data.subject}`,
      html: `
        <h2>お問い合わせを受け付けました</h2>
        <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
          <tr>
            <th style="border: 1px solid #ddd; padding: 12px; background: #f5f5f5; text-align: left;">お名前</th>
            <td style="border: 1px solid #ddd; padding: 12px;">${escapeHtml(data.name)}</td>
          </tr>
          <tr>
            <th style="border: 1px solid #ddd; padding: 12px; background: #f5f5f5; text-align: left;">メールアドレス</th>
            <td style="border: 1px solid #ddd; padding: 12px;">${escapeHtml(data.email)}</td>
          </tr>
          <tr>
            <th style="border: 1px solid #ddd; padding: 12px; background: #f5f5f5; text-align: left;">件名</th>
            <td style="border: 1px solid #ddd; padding: 12px;">${escapeHtml(data.subject)}</td>
          </tr>
          <tr>
            <th style="border: 1px solid #ddd; padding: 12px; background: #f5f5f5; text-align: left;">メッセージ</th>
            <td style="border: 1px solid #ddd; padding: 12px; white-space: pre-wrap;">${escapeHtml(data.message)}</td>
          </tr>
        </table>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      return new Response(JSON.stringify({ success: false, errors: ["メール送信に失敗しました"] }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 自動返信メール送信
    const { error: autoReplyError } = await resend.emails.send({
      from: import.meta.env.CONTACT_FROM_EMAIL || "onboarding@resend.dev",
      to: data.email,
      subject: `【自動返信】お問い合わせを受け付けました`,
      html: `
        <p>${escapeHtml(data.name)} 様</p>
        <p>この度はお問い合わせいただき、誠にありがとうございます。<br>以下の内容でお問い合わせを受け付けました。</p>
        <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
          <tr>
            <th style="border: 1px solid #ddd; padding: 12px; background: #f5f5f5; text-align: left;">件名</th>
            <td style="border: 1px solid #ddd; padding: 12px;">${escapeHtml(data.subject)}</td>
          </tr>
          <tr>
            <th style="border: 1px solid #ddd; padding: 12px; background: #f5f5f5; text-align: left;">メッセージ</th>
            <td style="border: 1px solid #ddd; padding: 12px; white-space: pre-wrap;">${escapeHtml(data.message)}</td>
          </tr>
        </table>
        <p style="margin-top: 24px;">内容を確認の上、順次ご返信いたします。<br>しばらくお待ちくださいませ。</p>
        <hr style="margin-top: 32px; border: none; border-top: 1px solid #ddd;">
        <p style="font-size: 12px; color: #999;">※このメールは自動送信されています。このメールへの返信はできません。</p>
      `,
    });

    if (autoReplyError) {
      console.error("Auto-reply error:", autoReplyError);
    }

    return new Response(JSON.stringify({ success: true, message: "お問い合わせを送信しました" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Contact form error:", error);
    return new Response(
      JSON.stringify({ success: false, errors: ["送信に失敗しました。しばらく経ってから再度お試しください。"] }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
};
