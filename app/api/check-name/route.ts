import { NextRequest, NextResponse } from "next/server";

// 指定した氏名が、スプレッドシートに既に記録済み(回答済み)かどうかを確認するAPI。
// GAS_WEBHOOK_URL が未設定の場合は、記録自体が行われないため常に「未回答」として扱う。
export async function GET(req: NextRequest) {
  const webhookUrl = process.env.GAS_WEBHOOK_URL;
  const name = req.nextUrl.searchParams.get("name")?.trim();

  if (!name) {
    return NextResponse.json({ ok: false, error: "name is required" }, { status: 400 });
  }

  if (!webhookUrl) {
    return NextResponse.json({ ok: true, alreadyAnswered: false });
  }

  try {
    const url = new URL(webhookUrl);
    url.searchParams.set("name", name);
    const res = await fetch(url.toString(), { method: "GET", redirect: "follow" });
    if (!res.ok) {
      throw new Error(`upstream responded ${res.status}`);
    }
    const data = (await res.json()) as { alreadyAnswered?: boolean };
    return NextResponse.json({ ok: true, alreadyAnswered: Boolean(data.alreadyAnswered) });
  } catch (err) {
    console.error("Failed to check existing name:", err);
    // 確認に失敗した場合、誤って回答をブロックしないよう「未回答」扱いで進める
    return NextResponse.json({ ok: true, alreadyAnswered: false, checkFailed: true });
  }
}
