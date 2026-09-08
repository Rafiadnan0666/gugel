export interface TaskResult {
  status: 'completed' | 'failed' | 'pending';
  output?: string;
  providerUsed?: string;
}

export class AIEngine {
  private tokenCount = 0;
  private completedTasksList: any[] = [];
  private allTasksList: any[] = [];

  async executeTask(type: string, description: string, input: any): Promise<TaskResult> {
    this.tokenCount += 100;
    const task = { type, description, input, status: 'completed' };
    this.completedTasksList.push(task);
    this.allTasksList.push(task);
    return { status: 'completed', output: '', providerUsed: 'ai' };
  }

  getTotalTokensUsed(): number {
    return this.tokenCount;
  }

  getCompletedTasks(): any[] {
    return this.completedTasksList;
  }

  getAllTasks(): any[] {
    return this.allTasksList;
  }
}
