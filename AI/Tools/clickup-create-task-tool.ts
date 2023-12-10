import { HttpService } from "@nestjs/axios";
import { StructuredTool } from "langchain/tools";
import { catchError, firstValueFrom, throwError } from "rxjs";
import { z } from "zod";

export class ClickuCreateTaskServiceTool extends StructuredTool {
  readonly CLICK_UP_API_KEY = process.env.CLICK_UP_API_KEY ?? "";

  name = "clickup-tasks-create-service";

  description =
    "This tool helps to create new tasks in clickup and return the response as a json object.";

  schema = z.object({
    folderId: z.string().describe("The id of the folder to get the tasks from"),
    name: z.string().describe("The name of the task"),
    description: z.string().describe("The description of the task"),
  });

  constructor(private readonly httpService: HttpService) {
    super(...arguments);
  }

  async _call(input: { folderId: string; name: string; description: string }) {
    const { folderId, name, description } = input;

    const body = {
      name,
      description,
    };

    const { data } = await firstValueFrom(
      this.httpService.post(
        `https://api.clickup.com/api/v2/list/${folderId}/task`,
        body,
        {
          headers: {
            Authorization: this.CLICK_UP_API_KEY,
          },
        }
      )
    );

    const {
      id,
      description: taskDescription,
      text_content,
      status,
    } = await data;

    const response = {
      id,
      name,
      description: taskDescription || text_content,
      status: status ? status.status : null,
    };

    return JSON.stringify(response);
  }
}
