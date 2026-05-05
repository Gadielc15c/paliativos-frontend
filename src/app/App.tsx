import { RouterProvider } from "react-router-dom";
import { RootProviders } from "./providers";
import { router } from "./routes";

export default function App() {
  return (
    <RootProviders>
      <RouterProvider router={router} />
    </RootProviders>
  );
}
