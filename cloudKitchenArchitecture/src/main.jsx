import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import BeastBurgerArchitecture from "./cloudKitchen.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BeastBurgerArchitecture />
  </StrictMode>
);
