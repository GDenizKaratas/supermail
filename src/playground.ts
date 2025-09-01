import { db } from "./server/db";

await db.user.create({
  data: {
    emailAddress: "test@gmail.com",
    firstName: "Test",
    lastName: "User",
    imageUrl: "https://i.pravatar.cc/150?u=a042581f4e29026704d",
  },
});

console.log("User created");
