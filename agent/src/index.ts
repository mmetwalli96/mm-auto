import { agent } from "./agent";

const question = "Is there a supply shortfall in the factory?";

try {
  const answer = await agent.invoke({
    messages: [{ role: "user", content: question }],
  });
  console.log(answer);
} catch (error) {
  console.error("Error invoking agent:", error);
}
