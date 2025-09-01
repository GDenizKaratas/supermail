import { db } from "@/server/db";

export const POST = async (req: Request) => {
  const { data } = await req.json();
  console.log("Received webhook:", data);
  const emailAddress =
    data?.email_addresses[0]?.email_address ?? "example@example.com";
  const firstName = data?.first_name;
  const lastName = data?.last_name;
  const imageUrl = data?.image_url;

  await db.user.create({
    data: {
      emailAddress: emailAddress,
      firstName: firstName,
      lastName: lastName,
      imageUrl: imageUrl,
    },
  });

  console.log(`User created: ${emailAddress}`);
  return new Response("Webhook received", { status: 200 });
};
