import GuestRoute from "@/components/wrappers/GuestRoute";

const Page = () => {
  return (
    <GuestRoute>
      <div className="flex w-full items-center justify-center py-20 text-white">Login Here</div>
    </GuestRoute>
  );
};

export default Page;
