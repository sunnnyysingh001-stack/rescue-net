import "./style.css";
export const metadata = {
  title: "RESCUE.NET | Disaster Response Demo",
  description:
    "An interactive portfolio demo of incident reporting, rescue dispatch and relief inventory. Rebuilt by Sunny Singh. Fictional data; not an emergency service.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
