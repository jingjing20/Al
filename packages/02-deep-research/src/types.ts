export type ResearchState = {
	goal: string;
	iteration: number;
	max_iterations: number;
	gathered_info: string[];
	visited_urls: string[];      // Dedup: URLs already visited
	searched_queries: string[];  // Dedup: Queries already searched
	logs: string[];
};

export const INITIAL_STATE: ResearchState = {
	goal: "",
	iteration: 0,
	max_iterations: 5,
	gathered_info: [],
	visited_urls: [],
	searched_queries: [],
	logs: []
};
