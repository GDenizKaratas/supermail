import { db } from "@/server/db";
import { headers } from "next/headers";
import { Webhook } from "svix";

export const POST = async (req: Request) => {
  try {
    const headerPayload = await headers();
    const svix_id = headerPayload.get("svix-id");
    const svix_timestamp = headerPayload.get("svix-timestamp");
    const svix_signature = headerPayload.get("svix-signature");

    // If there are no headers, error out
    if (!svix_id || !svix_timestamp || !svix_signature) {
      console.error("Missing svix headers");
      return new Response("Error occured -- no svix headers", {
        status: 400,
      });
    }

    // Get the body
    const payload = await req.text();
    const body = JSON.parse(payload);

    // Create a new Svix instance with your secret.
    const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET || "");

    let evt: any;

    // Verify the payload with the headers
    try {
      evt = wh.verify(payload, {
        "svix-id": svix_id,
        "svix-timestamp": svix_timestamp,
        "svix-signature": svix_signature,
      });
    } catch (err) {
      console.error("Error verifying webhook:", err);
      return new Response("Error occured", {
        status: 400,
      });
    }

    // Get the ID and type
    const { id } = evt.data;
    const eventType = evt.type;

    console.log(`Webhook ID: ${id}`);
    console.log(`Webhook TYPE: ${eventType}`);

    // Handle the webhook
    if (eventType === "user.created") {
      const {
        id: userId,
        email_addresses,
        first_name,
        last_name,
        image_url,
      } = evt.data;

      const emailAddress = email_addresses?.[0]?.email_address;

      if (!emailAddress) {
        console.error("No email address found in webhook data");
        return new Response("No email address found", { status: 400 });
      }

      try {
        await db.user.create({
          data: {
            id: userId,
            emailAddress: emailAddress,
            firstName: first_name || "",
            lastName: last_name || "",
            imageUrl: image_url || null,
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
    }

    return new Response("Webhook received", { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response("Webhook error", { status: 500 });
  }
};
