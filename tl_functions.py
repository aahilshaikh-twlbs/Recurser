from twelvelabs import TwelveLabs
import os
from dotenv import load_dotenv
import time
from google import genai
from google.genai import types

load_dotenv()

tl_client=TwelveLabs(api_key=os.environ("TWELVELABS_API_KEY"))
go_client=genai.Client()

# marengo
def search():
    """
    Make a search request
    Description: This method performs a search across a specific index based on the provided parameters and returns a paginated iterator of search results.

    If you wish to use images as queries, ensure that your images meet the following requirements:

    Format: JPEG and PNG.
    Dimension: Must be at least 64 x 64 pixels.
    Size: Must not exceed 5MB.

    Parameters:

    Name	Type	Required	Description
    index_id	str	Yes	The unique identifier of the index to search.
    search_options	List
    [SearchCreateRequestSearchOptionsItem]	Yes	Specifies the sources of information the platform uses when performing a search. You must include the search options separately for each desired source of information. The search options you specify must be a subset of the model options used when you created the index.
    query_text	str	No	The text query to search for. This parameter is required for text queries.
    query_media_type	Literal["image"]	No	The type of media you wish to use. This parameter is required for media queries. For example, to perform an image-based search, set this parameter to image.
    query_media_file	core.File	No	The media file to use as a query. This parameter is required for media queries if query_media_url is not provided.
    query_media_url	str	No	The publicly accessible URL of a media file to use as a query. This parameter is required for media queries if query_media_file is not provided.
    adjust_confidence_level	float	No	The strictness of the thresholds for assigning the high, medium, or low confidence levels to search results. Min: 0, Max: 1, Default: 0.5.
    group_by	SearchCreateRequestGroupBy	No	Use this parameter to group or ungroup items in a response. Values: video, clip. Default: clip.
    threshold	ThresholdSearch	No	Filter on the level of confidence that the results match your query. Values: high, medium, low, none.
    sort_option	SearchCreateRequestSortOption	No	The sort order for the response. Values: score, clip_count. Default: score.
    operator	SearchCreateRequestOperator	No	Logical operator for combining search options. Values: or, and. Default: or.
    page_limit	int	No	The number of items to return on each page. Max: 50.
    filter	str	No	A stringified object to filter search results based on video metadata or custom fields.
    include_user_metadata	bool	No	Specifies whether to include user-defined metadata in the search results.
    request_options	RequestOptions	No	Request-specific configuration.
    Return value: Returns a SyncPager[SearchItem] object that allows you to iterate through the paginated search results.

    The SyncPager[T] class contains the following properties and methods:

    Name	Type	Description
    items	Optional[List[T]]	A list containing the current page of items. Can be None.
    has_next	bool	Indicates whether there is a next page to load.
    get_next	Optional[Callable[[], Optional[SyncPager[T]]]]	A callable function that retrieves the next page. Can be None.
    response	Optional[BaseHttpResponse]	The HTTP response object. Can be None.
    next_page()	Optional[SyncPager[T]]	Calls get_next() if available and returns the next page object.
    __iter__()	Iterator[T]	Allows iteration through all items across all pages using for loops.
    iter_pages()	Iterator[SyncPager[T]]	Allows iteration through page objects themselves.
    The SearchItem class contains the following properties:

    Name	Type	Description
    score	Optional[float]	The score indicating how well the clip matches the search query.
    start	Optional[float]	The start time of the clip in seconds.
    end	Optional[float]	The end time of the clip in seconds.
    video_id	Optional[str]	The unique identifier of the video. Once the platform indexes a video, it assigns a unique identifier.
    confidence	Optional[str]	The confidence level of the match (high, medium, low).
    thumbnail_url	Optional[str]	The URL of the thumbnail image for the clip.
    transcription	Optional[str]	A transcription of the spoken words that are captured in the video.
    id	Optional[str]	The unique identifier of the video. Only appears when the group_by=video parameter is used in the request.
    user_metadata	Optional[typing.Dict[str, typping.Optional[typing.Any]]]	User-defined metadata associated with the video.
    clips	Optional[List[SearchItemClipsItem]]	An array that contains detailed information about the clips that match your query. The platform returns this array only when the group_by parameter is set to video in the request.
    The SearchItemClipsItem class contains the following properties:

    Name	Type	Description
    score	Optional[float]	The score indicating how well the clip matches the search query.
    start	Optional[float]	The start time of the clip in seconds.
    end	Optional[float]	The end time of the clip in seconds.
    confidence	Optional[str]	The confidence level of the match (high, medium, low).
    thumbnail_url	Optional[str]	The URL of the thumbnail image for the clip.
    transcription	Optional[str]	A transcription of the spoken words that are captured in the clip.
    video_id	Optional[str]	The unique identifier of the video for the corresponding clip.
    user_metadata	Optional[typing.Dict[str, typping.Optional[typing.Any]]]	User-defined metadata associated with the video.


    Error codes
    This section lists the most common error messages you may encounter while performing search requests.

    search_option_not_supported 
    Search option {search_option} is not supported for index {index_id}. Please use one of the following search options: {supported_search_option}.
    search_option_combination_not_supported
    Search option {search_option} is not supported with {other_combination}.
    search_filter_invalid
    Filter used in search is invalid. Please use the valid filter syntax by following filtering documentation.
    search_page_token_expired
    The token that identifies the page to be retrieved is expired or invalid. You must make a new search request. Token: {next_page_token}.
    index_not_supported_for_search:
    You can only perform search requests on indexes with an engine from the Marengo family enabled.
    For a list of errors specific to this endpoint and general errors that apply to all endpoints, see the Error codes page.

    """
    response = tl_client.search.query(
        index_id="<YOUR_INDEX_ID>",
        search_options=["visual", "audio"],
        query_text="cat",
        group_by="video",
        threshold="medium",
        operator="or",
        filter='{"category": "nature"}',
        page_limit=5,
        sort_option="score",
        adjust_confidence_level=0.5
    )
    print("Search Results:")
    for item in response:
        if item.id and item.clips:  # Grouped by video
            print(f"Video ID: {item.id}")
            for clip in item.clips:
                print("  Clip:")
                print(f"    Score: {clip.score}")
                print(f"    Start: {clip.start}")
                print(f"    End: {clip.end}")
                print(f"    Video ID: {clip.video_id}")
                print(f"    Confidence: {clip.confidence}")
                print(f"    Thumbnail URL: {clip.thumbnail_url}")
        else:  # Individual clips
            print(f"  Score: {item.score}")
            print(f"  Start: {item.start}")
            print(f"  End: {item.end}")
            print(f"  Video ID: {item.video_id}")
            print(f"  Confidence: {item.confidence}")
            print(f"  Thumbnail URL: {item.thumbnail_url}")
            if item.transcription:
                print(f"  Transcription: {item.transcription}")

### pegasus
def summarize_highlight():
    """
    Summaries, chapters, and highlights
    This method method has been flattened and is now called tl_client.summarize instead of tl_client.generate.summarize. The tl_client.generate.summarize method will remain available until July 30, 2025; after this date, it will be deprecated. Update your code to use tl_client.summarize to ensure uninterrupted service.
    Description: This method analyzes a video and generates summaries, chapters, or highlights based on its content. Optionally, you can provide a prompt to customize the output.
    
    Parameters:

    Name	Type	Required	Description
    video_id	str	Yes	The unique identifier of the video that you want to summarize.
    type	str	Yes	Specifies the type of text. Use one of the following values: summary, chapter, or highlight.
    prompt	Optional[str]	No	Use this field to provide context for the summarization task, such as the target audience, style, tone of voice, and purpose. Your prompts can be instructive or descriptive, or you can also phrase them as questions. The maximum length of a prompt is 2,000 tokens.
    temperature	Optional[float]	No	Controls the randomness of the text output generated by the model. A higher value generates more creative text, while a lower value produces more deterministic text output. Default: 0.2, Min: 0, Max: 1.
    request_options	typing.Optional[RequestOptions]	No	Request-specific configuration.
    Return value: Returns a SummarizeResponse object containing the generated content. The response type varies based on the type parameter.

    When type is "summary" - Returns a SummarizeResponse_Summary object with the following properties:

    Name	Type	Description
    summarize_type	Literal["summary"]	Indicates this is a summary response.
    id	Optional[str]	Unique identifier of the response.
    summary	Optional[str]	The generated summary text.
    usage	Optional[TokenUsage]	The number of tokens used in the generation.
    When type is "chapter" - Returns a SummarizeResponse_Chapter object with the following properties:

    Name	Type	Description
    summarize_type	Literal["chapter"]	Indicates this is a chapter response.
    id	Optional[str]	Unique identifier of the response.
    chapters	Optional[List[SummarizeChapterResultChaptersItem]]	An array of chapter objects.
    usage	Optional[TokenUsage]	The number of tokens used in the generation.
    When type is "highlight" - Returns a SummarizeResponse_Highlight object with the following properties:

    Name	Type	Description
    summarize_type	Literal["highlight"]	Indicates this is a highlight response.
    id	Optional[str]	Unique identifier of the response.
    highlights	Optional[List[SummarizeHighlightResultHighlightsItem]]	An array of highlight objects.
    usage	Optional[TokenUsage]	The number of tokens used in the generation.
    The SummarizeChapterResultChaptersItem class contains the following properties:

    Name	Type	Description
    chapter_number	Optional[int]	The sequence number of the chapter. Note that this field starts at 0.
    start_sec	Optional[float]	The starting time of the chapter, measured in seconds from the beginning of the video.
    end_sec	Optional[float]	The ending time of the chapter, measured in seconds from the beginning of the video.
    chapter_title	Optional[str]	The title of the chapter.
    chapter_summary	Optional[str]	A brief summary describing the content of the chapter.
    The SummarizeHighlightResultHighlightsItem class contains the following properties:

    Name	Type	Description
    start_sec	Optional[float]	The starting time of the highlight, measured in seconds from the beginning of the video.
    end_sec	Optional[float]	The ending time of the highlight, measured in seconds from the beginning of the video.
    highlight	Optional[str]	The title of the highlight.
    highlight_summary	Optional[str]	A brief description that captures the essence of this part of the video.
    The TokenUsage class contains the following properties:

    Name	Type	Description
    output_tokens	Optional[int]	The number of tokens in the generated text.


    """

    result = tl_client.summarize(
        video_id="<YOUR_VIDEO_ID>",
        type="summary",
        prompt="<YOUR_PROMPT>",
        temperature=0.2
    )
    print(f"Result ID: {result.id}")
    if hasattr(result, 'summary') and result.summary is not None:
        print(f"Summary: {result.summary}")
    if hasattr(result, 'chapters') and result.chapters is not None:
        print("Chapters:")
        for chapter in result.chapters:
            print(f"  Chapter {chapter.chapter_number}:")
            print(f"    Start: {chapter.start_sec}")
            print(f"    End: {chapter.end_sec}")
            print(f"    Title: {chapter.chapter_title}")
            print(f"    Summary: {chapter.chapter_summary}")
    if hasattr(result, 'highlights') and result.highlights is not None:
        print("Highlights:")
        for highlight in result.highlights:
            print(f"  Start: {highlight.start_sec}")
            print(f"  End: {highlight.end_sec}")
            print(f"  Highlight: {highlight.highlight}")
            print(f"  Summary: {highlight.highlight_summary}")
    if result.usage is not None:
        print(f"Output tokens: {result.usage.output_tokens}")
def open_ended_analysis():
    """
    Description: This method analyzes a video and generates text based on its content.

    Parameters:

    Name	Type	Required	Description
    video_id	str	Yes	The unique identifier of the video for which you wish to generate a text.
    prompt	str	Yes	A prompt that guides the model on the desired format or content. Your prompts can be instructive or descriptive, or you can also phrase them as questions. The maximum length of a prompt is 2,000 tokens.
    temperature	typing.Optional[float]	No	Controls the randomness of the text output generated by the model. A higher value generates more creative text, while a lower value produces more deterministic text output. Default: 0.2, Min: 0, Max: 1
    request_options	typing.Optional[RequestOptions]	No	Request-specific configuration.
    Return value: Returns a NonStreamAnalyzeResponse object containing the generated text.

    The NonStreamAnalyzeResponse class contains the following properties:

    Name	Type	Description
    id	Optional[str]	Unique identifier of the response.
    data	Optional[str]	The generated text based on the prompt you provided.
    usage	Optional[TokenUsage]	The number of tokens used in the generation.
    The TokenUsage class contains the following properties:

    Name	Type	Description
    output_tokens	Optional[int]	The number of tokens in the generated text.
    The maximum length of the response is 4,096 tokens.

    """

    result = tl_client.analyze(
        video_id="<YOUR_VIDEO_ID>",
        prompt="<YOUR_PROMPT>",
        temperature=0.2
    )
    print("Result ID:", result.id)
    print(f"Generated Text: {result.data}")
    if result.usage is not None:
        print(f"Output tokens: {result.usage.output_tokens}")
def open_ended_analysis_with_streaming_responses():
    """
    Description: This method analyzes a video and generates open-ended text based on its content.
    
    Parameters:

    Name	Type	Required	Description
    video_id	str	Yes	The unique identifier of the video for which you wish to generate a text.
    prompt	str	Yes	A prompt that guides the model on the desired format or content. Your prompts can be instructive or descriptive, or you can also phrase them as questions. The maximum length of a prompt is 2,000 tokens.
    temperature	Optional[float]	No	Controls the randomness of the text output generated by the model. A higher value generates more creative text, while a lower value produces more deterministic text output. Default: 0.2, Min: 0, Max: 1
    request_options	Optional[RequestOptions]	No	Request-specific configuration.
    Return value: Returns an iterator of AnalyzeStreamResponse objects. Each response can be a StreamStartResponse, StreamTextResponse, or StreamEndResponse.

    The StreamStartResponse class contains the following properties:

    Name	Type	Description
    event_type	Optional[str]	This field is always set to stream_start for this event.
    metadata	Optional[StreamStartResponseMetadata]	An object containing metadata about the stream.
    The StreamTextResponse class contains the following properties:

    Name	Type	Description
    event_type	Optional[str]	This field is always set to text_generation for this event.
    text	Optional[str]	A fragment of the generated text. Note that text fragments may be split at arbitrary points, not necessarily at word or sentence boundaries.
    The StreamEndResponse class contains the following properties:

    Name	Type	Description
    event_type	Optional[str]	This field is always set to stream_end for this event.
    metadata	Optional[StreamEndResponseMetadata]	An object containing metadata about the stream.
    The StreamStartResponseMetadata class contains the following properties:

    Name	Type	Description
    generation_id	Optional[str]	A unique identifier for the generation session.
    The StreamEndResponseMetadata class contains the following properties:

    Name	Type	Description
    generation_id	Optional[str]	The same unique identifier provided in the stream_start event.
    usage	Optional[TokenUsage]	The number of tokens used in the generation.
    The TokenUsage class contains the following properties:

    Name	Type	Description
    output_tokens	Optional[int]	The number of tokens in the generated text.
    The maximum length of the response is 4,096 tokens.



    """

    response = tl_client.analyze_stream(
        video_id="<YOUR_VIDEO_ID>",
        prompt="<YOUR_PROMPT>",
        temperature=0.2,
        stream=True
    )
    for chunk in response:
        if hasattr(chunk, 'event_type'):
            if chunk.event_type == "stream_start":
                print("Stream started")
            elif chunk.event_type == "text_generation":
                print(chunk.text, end="")
            elif chunk.event_type == "stream_end":
                print("\nStream ended")
                if chunk.metadata:
                    print(f"Metadata: {chunk.metadata}")

### google veo
def dialogue_and_sound_example():
    prompt = """A close up of two people staring at a cryptic drawing on a wall, torchlight flickering.
A man murmurs, 'This must be it. That's the secret code.' The woman looks at him and whispering excitedly, 'What did you find?'"""

    operation = go_client.models.generate_videos(
        model="veo-3.0-generate-preview",
        prompt=prompt,
    )

    # Poll the operation status until the video is ready.
    while not operation.done:
        print("Waiting for video generation to complete...")
        time.sleep(10)
        operation = go_client.operations.get(operation)

    # Download the generated video.
    generated_video = operation.response.generated_videos[0]
    go_client.files.download(file=generated_video.video)
    generated_video.video.save("dialogue_example.mp4")
    print("Generated video saved to dialogue_example.mp4")
def cinematic_realism_example():
    prompt = """Drone shot following a classic red convertible driven by a man along a winding coastal road at sunset, waves crashing against the rocks below.
The convertible accelerates fast and the engine roars loudly."""

    operation = go_client.models.generate_videos(
        model="veo-3.0-generate-preview",
        prompt=prompt,
    )

    # Poll the operation status until the video is ready.
    while not operation.done:
        print("Waiting for video generation to complete...")
        time.sleep(10)
        operation = go_client.operations.get(operation)

    # Download the generated video.
    generated_video = operation.response.generated_videos[0]
    go_client.files.download(file=generated_video.video)
    generated_video.video.save("realism_example.mp4")
    print("Generated video saved to realism_example.mp4")
def creative_animation_example():
    prompt = "A whimsical stop-motion animation of a tiny robot tending to a garden of glowing mushrooms on a miniature planet."

    operation = go_client.models.generate_videos(
        model="veo-3.0-generate-preview",
        prompt=prompt,
    )

    # Poll the operation status until the video is ready.
    while not operation.done:
        print("Waiting for video generation to complete...")
        time.sleep(10)
        operation = go_client.operations.get(operation)

    # Download the generated video.
    generated_video = operation.response.generated_videos[0]
    go_client.files.download(file=generated_video.video)
    generated_video.video.save("style_example.mp4")
    print("Generated video saved to style_example.mp4")
def params_example():
    operation = go_client.models.generate_videos(
        model="veo-3.0-generate-preview",
        prompt="A cinematic shot of a majestic lion in the savannah.",
        config=types.GenerateVideosConfig(negative_prompt="cartoon, drawing, low quality"),
    )

    # Poll the operation status until the video is ready.
    while not operation.done:
        print("Waiting for video generation to complete...")
        time.sleep(10)
        operation = go_client.operations.get(operation)

    # Download the generated video.
    generated_video = operation.response.generated_videos[0]
    go_client.files.download(file=generated_video.video)
    generated_video.video.save("parameters_example.mp4")
    print("Generated video saved to parameters_example.mp4")
def async_example():
    # After starting the job, you get an operation object.
    operation = go_client.models.generate_videos(
        model="veo-3.0-generate-preview",
        prompt="A cinematic shot of a majestic lion in the savannah.",
    )

    # Alternatively, you can use operation.name to get the operation.
    operation = types.GenerateVideosOperation(name=operation.name)

    # This loop checks the job status every 10 seconds.
    while not operation.done:
        time.sleep(10)
        # Refresh the operation object to get the latest status.
        operation = go_client.operations.get(operation)

    # Once done, the result is in operation.response.
    # ... process and download your video ...