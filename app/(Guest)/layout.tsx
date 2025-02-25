import Footer from "@/components/Guest/Footer/Footer";
import { GuestHeader } from "@/components/Guest/Header/GuestHeader";
import { SidebarProvider } from "@/components/ui/sidebar";

type Props = {
  children: React.ReactNode;
};
const layout: React.FC<Props> = ({ children }) => {
  return (
    <SidebarProvider className="flex min-h-screen flex-col justify-between">
      <GuestHeader />
      {children}
      <Footer />
    </SidebarProvider>
  );
};

export default layout;
