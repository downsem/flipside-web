import { redirect } from "next/navigation";

export default function PeopleHome() {
  // People Mode "home" is the People Mode Add Flip (prototype) experience.
  redirect("/prototype/create");
}
