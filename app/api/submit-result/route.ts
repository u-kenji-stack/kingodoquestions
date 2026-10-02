import { NextRequest, NextResponse } from "next/server";

// 回答結果をGoogleスプレッドシート(Apps Script Webアプリ)へ転送するAPI。
// 環境変数 GAS_WEBHOOK_URL が未設定の場合は何もせず200を返す(クイズの動作自体は妨げない)。
export async function POST(req: NextRequest) {
  const webhookUrl = process.env.GAS_WEBHOOK_URL;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 });
  }

  if (!webhookUrl) {
    console.warn("GAS_WEBHOOK_URL is not set; skipping result logging");
    return NextResponse.json({ ok: true, logged: false });
  }

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      // Apps Scriptのリダイレクト(302)を自動追跡させる
      redirect: "follow",
    });
    if (!res.ok) {
      throw new Error(`upstream responded ${res.status}`);
    }
    return NextResponse.json({ ok: true, logged: true });
  } catch (err) {
    console.error("Failed to forward quiz result to spreadsheet:", err);
    // ログ記録の失敗はユーザー体験に影響させない(クイズ自体は続行可能)
    return NextResponse.json({ ok: false, logged: false }, { status: 502 });
  }
}
