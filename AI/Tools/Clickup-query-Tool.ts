import { StructuredTool } from "langchain/tools";
import { z } from "zod";

export class ClickupQueryServiceTool extends StructuredTool {
  readonly CLICK_UP_API_KEY = process.env.CLICK_UP_API_KEY ?? "";

  name = "clickup-tasks-service";

  description =
    "This tool query the clickup api to get the tasks of a client and return the response as a json object.";

  schema = z.object({
    folderId: z.string().describe("The id of the folder to get the tasks from"),
  });

  constructor() {
    super(...arguments);
  }

  // eslint-disable-next-line no-underscore-dangle
  async _call(input: { folderId: string }) {
    const { folderId } = input;
    const resp = await fetch(
      `https://api.clickup.com/api/v2/list/${folderId}/task`,
      {
        method: "GET",
        headers: {
          Authorization: this.CLICK_UP_API_KEY,
        },
      }
    );

    const { tasks } = await resp.json();
    const mappedData = tasks.map(
      (task: {
        name: any;
        description: any;
        status: { status: any };
        due_date: string | number;
        start_date: string | number;
        priority: any;
        assignees: any[];
      }) => ({
        name: task.name,
        description: task.description,
        status: task.status ? task.status.status : null,
        dueDate: task.due_date
          ? new Date(+task.due_date).toLocaleDateString()
          : null,
        startDate: task.start_date
          ? new Date(+task.start_date).toLocaleDateString()
          : null,
        priority: task.priority,
        assignees: task.assignees.map((assignee) => ({
          username: assignee.username,
        })),
      })
    );
    return JSON.stringify(mappedData);
  }
}
