import { useEffect, useState } from "react";

export default function ToolPanel({
  isSessionActive,
  sendClientEvent,
  events,
}) {
  const INITIAL_GREETING =
    "Hello there! Welcome. I'm here to listen and understand what's going on for you today. Take a deep breath, settle in, and tell me, how are you doing in this moment?";

  const GOAL = `The goal is to help fully understand the client's internal representations, strategies, and challenges. Explore 12 categories: Presenting Problem, Outcome Specification, Representational Systems, Submodalities, Eye Accessing Cues, Anchors, Values & Criteria, Beliefs, Strategies, Parts, Timeline, and Meta Model Language Patterns. Ask open-ended questions, clarify with follow-ups, and listen for patterns. When you have gathered enough information, format a summary in markdown with the prefix SUMMARY_COMPLETE.`;
  const [insightData, setInsightData] = useState(null);
  const [sessionInitialized, setSessionInitialized] = useState(false);
  const MAX_QUESTIONS_BEFORE_CHECK = 5;
  const [messagesCount, setMessagesCount] = useState(0);

  useEffect(() => {
    if (!events || events.length === 0) return;

    const firstEvent = events[events.length - 1];
    if (!sessionInitialized && firstEvent.type === "session.created") {
      // Initialize with NLP assessment system prompt
      sendClientEvent({
        type: "session.update",
        session: {
          instructions: `start by saying: ${INITIAL_GREETING}
          here is your goal: ${GOAL}`,
        },
      });
      setSessionInitialized(true);
    }
    const userMessages = events.filter(
      (e) => e.type === "conversation.item.created" && e.item?.role === "user",
    );
    console.log("userMessages ", userMessages);
    console.log("messagesCount ", messagesCount);
    // If we have a new user message and reached threshold, request evaluation
    if (userMessages.length > messagesCount) {
      setMessagesCount(userMessages.length);

      // After every MAX_QUESTIONS_BEFORE_CHECK user messages, ask the model to evaluate
      if (userMessages.length % MAX_QUESTIONS_BEFORE_CHECK === 0) {
        console.log("Asking for evaluation....");
        sendClientEvent({
          type: "response.create",
          response: {
            instructions: `
              Evaluate if you have gathered enough information about the user's internal representations, 
              strategies, and challenges. If you need more information, continue asking relevant questions. 
              If you have sufficient information, respond with a markdown-formatted summary prefixed with 
              "SUMMARY_COMPLETE:" that highlights what you've learned about the user.
            `,
          },
        });
      }
    }

    // Check for summary completion in responses
    const responseEvents = events.filter((e) => e.type === "response.done");
    if (responseEvents.length > 0) {
      const lastResponse = responseEvents[0];
      const outputTexts =
        lastResponse.response?.output
          ?.filter((o) => o.type === "text")
          ?.map((o) => o.text) || [];

      const fullText = outputTexts.join("");

      if (fullText.includes("SUMMARY_COMPLETE:")) {
        const summaryText = fullText.split("SUMMARY_COMPLETE:")[1].trim();
        setInsightData({
          summary: summaryText,
          completed: true,
        });
      }
    }
  }, [events, sessionInitialized, messagesCount]);

  useEffect(() => {
    if (!isSessionActive) {
      setSessionInitialized(false);
      setInsightData(null);
      setMessagesCount(0);
    }
  }, [isSessionActive]);

  return (
    <section className="h-full w-full flex flex-col gap-4">
      <div className="h-full bg-gray-50 rounded-md p-4">
        <h2 className="text-lg font-bold">User Insights</h2>
        {isSessionActive ? (
          insightData?.completed ? (
            <div className="markdown-content">
              <div dangerouslySetInnerHTML={{ __html: insightData.summary }} />
            </div>
          ) : (
            <p>Gathering insights from conversation...</p>
          )
        ) : (
          <p>Start the session to begin assessment...</p>
        )}
      </div>
    </section>
  );
}
