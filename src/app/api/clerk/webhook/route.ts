import { db } from "@/server/db";

export const POST = async (req: Request) => {
  try {
    const { data } = await req.json();
    console.log("Received webhook data:", data);

    const emailAddress = data?.email_addresses?.[0]?.email_address;
    const firstName = data?.first_name || "";
    const lastName = data?.last_name || "";
    const imageUrl = data?.image_url || null;
    const userId = data?.id;

    if (!emailAddress) {
      console.error("No email address found in webhook data");
      return new Response("No email address found", { status: 400 });
    }

    if (!userId) {
      console.error("No user ID found in webhook data");
      return new Response("No user ID found", { status: 400 });
    }

    try {
      await db.user.create({
        data: {
          id: userId,
          emailAddress: emailAddress,
          firstName: firstName,
          lastName: lastName,
          imageUrl: imageUrl,
        },
      });

      console.log(`User created successfully: ${emailAddress}`);
    } catch (error) {
      console.error("Error creating user:", error);
      // If user already exists, that's okay
      if (
        error instanceof Error &&
        error.message.includes("Unique constraint")
      ) {
        console.log(`User already exists: ${emailAddress}`);
      } else {
        throw error;
      }
    }

    return new Response("Webhook received", { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response("Webhook error", { status: 500 });
  }
};
