import { Body, Container, Head, Heading, Html, Preview, Text } from "@react-email/components";
import { render } from "@react-email/render";
import { Resend } from "resend";

function MesNotification({ title, message }: { title: string; message: string }) {
  return <Html><Head/><Preview>{title}</Preview><Body style={{ backgroundColor: "#f5f7fa", fontFamily: "Arial,sans-serif" }}><Container style={{ margin: "36px auto", padding: "28px", maxWidth: "560px", backgroundColor: "#fff", borderRadius: "10px" }}><Heading style={{ color: "#19304d", fontSize: "20px" }}>FAMAX MES</Heading><Heading as="h2" style={{ fontSize: "17px" }}>{title}</Heading><Text style={{ color: "#627083", lineHeight: "1.7" }}>{message}</Text><Text style={{ color: "#8793a1", fontSize: "12px" }}>This is an automated manufacturing operations notification.</Text></Container></Body></Html>;
}

export async function sendMesEmail(to: string, subject: string, message: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { sent: false, reason: "RESEND_API_KEY is not configured" } as const;
  const resend = new Resend(apiKey);
  const html = await render(<MesNotification title={subject} message={message}/>);
  const result = await resend.emails.send({ from: process.env.EMAIL_FROM ?? "FAMAX MES <notifications@famax.example>", to, subject, html });
  if (result.error) throw new Error(`Email delivery failed: ${result.error.message}`);
  return { sent: true, id: result.data?.id } as const;
}
