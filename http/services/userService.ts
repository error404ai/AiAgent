import { db } from "@/db/db";
import { usersTable } from "@/db/schema";
import { UserType } from "@/db/schema/users";
import { passwordUpdateSchema } from "@/db/zodSchema/passwordUpdateSchema";
import { profileBasicInfoSchema } from "@/db/zodSchema/profileUpdateSchema";
import { makeHash, verifyHash } from "@/utils/utils";
import { eq } from "drizzle-orm";
import { z, ZodError } from "zod";
import { UploadService } from "./uploadService";

class UserService {
  static async findByCustomerId(customerId: string): Promise<UserType | null> {
    const user = await db.query.usersTable.findFirst({
      where: eq(usersTable.customer_id, customerId),
    });

    return user ?? null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static async findByEmail(email: string, tx?: any): Promise<UserType | null> {
    const user = await (tx ?? db).query.usersTable.findFirst({
      where: eq(usersTable.email, email),
    });

    return user ?? null;
  }

  static async getUsers() {
    return await db.select().from(usersTable);
  }
  static async updateProfileBasicInfo(data: z.infer<typeof profileBasicInfoSchema>, formData: FormData): Promise<boolean> {
    const uploadService = new UploadService();
    const avatar = formData.get("avatar") as File | null;
    await db.transaction(async (tx) => {
      const user = await tx.query.usersTable.findFirst({
        where: eq(usersTable.customer_id, data.customer_id),
      });

      if (!user) {
        throw new ZodError([{ code: "custom", message: "User not found", path: ["customer_id"] }]).toString();
      }

      // check if the email is already exist
      if (user?.email !== data.email) {
        const existingUser = await UserService.findByEmail(data.email, tx);
        if (existingUser && existingUser.customer_id !== user?.customer_id) {
          throw new ZodError([{ code: "custom", message: "Email already exists", path: ["email"] }]).toString();
        }
      }

      if (avatar) {
        if (user?.avatar && (await uploadService.fileExists(user.avatar))) {
          console.log("exists");
          await uploadService.deleteFile(user.avatar);
        }
        const uploadedImage = await uploadService.uploadImage(avatar, {
          width: 400,
          height: 400,
          quality: 80,
          directory: "uploads/images/avatars",
        });
        await tx
          .update(usersTable)
          .set({
            ...data,
            avatar: uploadedImage ? uploadedImage.path : null,
          })
          .where(eq(usersTable.customer_id, data.customer_id));
      } else {
        await tx
          .update(usersTable)
          .set({
            ...data,
          })
          .where(eq(usersTable.customer_id, data.customer_id));
      }
    });

    return true;
  }

  static async updatePassword(customerId: string, data: z.infer<typeof passwordUpdateSchema>): Promise<boolean | string> {
    try {
      const user = await db.query.usersTable.findFirst({
        where: eq(usersTable.customer_id, customerId),
      });

      if (!user) {
        return false;
      }

      const passwordMatched = await verifyHash(data.currentPassword, user.password);

      if (!passwordMatched) {
        return new ZodError([{ code: "custom", message: "Current password is incorrect", path: ["currentPassword"] }]).toString();
      }

      if (data.newPassword !== data.confirmPassword) {
        return new ZodError([{ code: "custom", message: "New password and confirm password do not match", path: ["confirmPassword"] }]).toString();
      }

      await db
        .update(usersTable)
        .set({ password: await makeHash(data.newPassword) })
        .where(eq(usersTable.customer_id, customerId));

      return true;
    } catch {
      return false;
    }
  }

  static async deleteUser(userId: number): Promise<void> {
    try {
      await db.delete(usersTable).where(eq(usersTable.id, userId));
    } catch (error) {
      console.error("Error deleting user:", error);
      throw new Error("Failed to delete user.");
    }
  }
}

export default UserService;
