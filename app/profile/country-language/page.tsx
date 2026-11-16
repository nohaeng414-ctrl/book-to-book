import { redirect } from "next/navigation";

export default function CountryLanguagePage() {
  redirect("/profile#location-settings");
}
