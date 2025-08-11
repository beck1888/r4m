## Imports
from pathlib import Path
import os
from openai import OpenAI

## Helper functions
def __find_secrets_file():
    expected_secrets_fp = Path(__file__).parent.__str__() + '/.env.local' # I don't want to talk about this one
    if os.path.exists(expected_secrets_fp):
        return expected_secrets_fp
    else:
        raise FileNotFoundError("No secrets file exists. Create at 'backend/backend_helpers/.env.local' and try again.")

def __get_openai_api_key():
    secrets_file = __find_secrets_file()

    openai_api_key_lookup_helper = None
    with open(secrets_file, 'r', encoding='UTF-8') as f:
        lines = f.readlines()

    for line in lines:
        line = line.strip()
        if line.startswith("OPENAI_API_KEY"):
            openai_api_key_lookup_helper = line.split('=')[1].strip()

    if openai_api_key_lookup_helper is None:
        raise RuntimeError("No OPENAI_API_KEY set. Add and try again.")
    
    return openai_api_key_lookup_helper

def __get_summarizer_system_instructions(author):
    instruction_path = Path(__file__).parent.__str__() + '/assets/summarizer_system_prompt.txt'
    with open(instruction_path, 'r') as f:
        instructions = f.read()
    instructions = instructions.replace(r'{{name}}', author)

    return instructions

## Main summarize function
def summarize_transcript_with_openai_gpt(transcript, channel_name):
    client = OpenAI(api_key=__get_openai_api_key())

    summary = client.chat.completions.create(
        model='gpt-5', # gpt-5 doesn't allow us to set a temp so don't use or it will error
        # temperature=0.2, # Balance format and friendliness
        messages=[{
            'role': 'system',
            'content': __get_summarizer_system_instructions(channel_name)
        },
        {
            'role': 'user',
            'content': transcript
        }]
    ).choices[0].message.content

    return summary
