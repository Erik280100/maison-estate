import type { Metadata } from "next";
import { TodoBoard } from "@/features/todos/TodoBoard";

export const metadata: Metadata = { title: "To-dos" };

export default function TodosPage() {
  return <TodoBoard />;
}
