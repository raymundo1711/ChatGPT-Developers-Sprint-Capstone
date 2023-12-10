import { Injectable } from "@nestjs/common";
import { ChatOpenAI } from "langchain/chat_models/openai";

import { ChatPromptTemplate, MessagesPlaceholder } from "langchain/prompts";
import { RunnableSequence } from "langchain/schema/runnable";
import { AgentExecutor } from "langchain/agents";
import { formatToOpenAIToolMessages } from "langchain/agents/format_scratchpad/openai_tools";
import {
  OpenAIToolsAgentOutputParser,
  type ToolsAgentStep,
} from "langchain/agents/openai/output_parser";
import { formatToOpenAITool } from "langchain/tools";
import { BufferMemory } from "langchain/memory";
import { HttpService } from "@nestjs/axios";
import { ClickupQueryServiceTool } from "../Tools/Clickup-query-Tool";
import { template } from "../templates/slakbot-template";
import { ClickuCreateTaskServiceTool } from "../Tools/clickup-create-task-tool";

@Injectable()
export class AiAssistantService {
  agent: AgentExecutor;

  memory = new BufferMemory({
    memoryKey: "history",
    inputKey: "question",
    outputKey: "answer",
    returnMessages: true,
  });

  constructor(payload: { folderId; PMid; lang }) {
    this.agent = this.loadModel(payload);
  }

  loadModel(payload: { folderId: string; PMid: string; lang: string }) {
    const { folderId, PMid, lang } = payload;

    const model = new ChatOpenAI({
      modelName: "gpt-3.5-turbo-1106",
      temperature: 0,
    });

    const tools = [
      new ClickupQueryServiceTool(),
      new ClickuCreateTaskServiceTool(new HttpService()),
    ];
    const modelWithTools = model.bind({ tools: tools.map(formatToOpenAITool) });

    const prompt = ChatPromptTemplate.fromMessages([
      ["ai", template(folderId, PMid, lang)],
      new MessagesPlaceholder("chat_history"),
      ["human", "{input}"],
      new MessagesPlaceholder("agent_scratchpad"),
    ]);

    const runnableAgent = RunnableSequence.from([
      {
        input: (i: { input: string; steps: ToolsAgentStep[] }) => i.input,
        chat_history: async (_: { input: string; steps: ToolsAgentStep[] }) => {
          const { history } = await this.memory.loadMemoryVariables({});
          return history;
        },
        agent_scratchpad: (i: { input: string; steps: ToolsAgentStep[] }) =>
          formatToOpenAIToolMessages(i.steps),
      },
      prompt,
      modelWithTools,
      new OpenAIToolsAgentOutputParser(),
    ]).withConfig({ runName: "OpenAIToolsAgent" });

    const executor = AgentExecutor.fromAgentAndTools({
      agent: runnableAgent,
      tools,
    });

    return executor;
  }

  async run(input: string) {
    const { output } = await this.agent.call({ input });

    await this.save_memory(input, output);

    return output;
  }

  async save_memory(question: string, result: string) {
    await this.memory.saveContext(
      {
        question,
      },
      {
        answer: result,
      }
    );
  }
}
