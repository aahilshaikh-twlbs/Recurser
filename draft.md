# PRD Idea: Circuit/Recurser

- Name: Circuit/Recurser (follows a set of instructions, and continually repeats until peak output is achieved)

## Architecture

### INPUT(s)

Must have a detailed criteria for what has to be met ideally in some textbox; output duration, objects present, style, consistency...

- A prompting area for the user to query a video-generation tool (e.g. OpenAI Sora)
- An upload button for user to upload already generated video (**along with what prompt was given for generating** depending on their use case)

### PLANNER
- Uses some if-else tree to determine where the code goes depending on the user input
    - If generating vid; have video-generation step actually querying Sora, also create a folder with completed generated output (program will refer to this actively when recursing)
    - If pre-gen vid; skip to [the grader step](#grader)

### GRADER
- Refers to either the at-runtime-generated-video or the uploaded/provided video (will have to have some basic file checks and whatnot for peak user-friendliness)
- Basic criteria
    - Should be able to generalize a score and give an accurate rating of how "ai" a video is, and exact reasonings as to why
    - Should be able to determine if its not an ai-video; e.g. a real recording
- Will use:
    - `Marengo 2.7`: to "grade" the actual video, looking out for inconsistencies, hallucinations, things that shouldn't be in the video based on the prompt, and give a short output with how accurate it was
    - `Pegasus 1.2`: to use the Marengo output in addition to it's own analysis to essentially re-prompt Sora, for example with a better, improved prompt to create a more accurate video
        - It will then send it back to [the planner](#planner) until some `x`% confidence (confidence as in accuracy of prompt met in the video generated) is met (user can change `x`); output is then given to the user once more as a perfected version of their given prompt or video

## Possible Use-Cases
- This was just an idea from me; but I could maybe see this being used for companies which focus on ai-generated content, because this can easily branch into not just ai-generated video but also audio (11labs?); those companies may want a way to see what prompts work better with their models and how their outputs can be refined.