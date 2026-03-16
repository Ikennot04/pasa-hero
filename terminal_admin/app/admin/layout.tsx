import Drawer from "./Drawer";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <Drawer>{children}</Drawer>;
}
