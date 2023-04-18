# # Code Explanation

## Importing Libraries
- `os`: It is used here to provide operating system-dependent functionality.
- `spacy`: This is the Python library for natural language processing. It is used here for entity recognition.
- `EntityRuler`: This is the pipeline component provided by `spacy` for rule-based entity recognition.
- Once os, spacy, regex, and saxchone are imported. It then the logic patterns that were labeled by me and turns them into XML tags. The label coressponds with the pattern and wraps around the label. 
- It then takes the new tagged XML patterns and squishes them all into a new large string. 

- Then cleans it up removing punctuations issues using regex. 
- After it then sends the tokens to the named entity collector function where it will form an output.     
-                                                   
- print(f"{AllNames=}")
    AllNamesKeys = list(AllNames.keys())
    AllNamesKeys.sort()
    SortedDict =  {i: AllNames[i] for i in AllNamesKeys}
    print(f"{SortedDict=}")
    writeSortedEntries(SortedDict)
- This function above will print the files to a useful output for review. 

- `PySaxonProcessor`: This is a library for working with XML documents using the Saxon processor.
- `CollPath`: This variable is set to the path of the directory where XML files for the Star Wars project are stored.
- `TargetPath`: This variable is set to the relative path of the directory where tagged XML files with attributes will be saved.
## Applying Patterns to the Entity Ruler
- `nlp.add_pipe("span_ruler", before="ner", config=config)`: This adds the `EntityRuler` to the `nlp` pipeline before the named entity recognition (`ner`) component. The `config` dictionary is passed to configure the `EntityRuler` component with the settings defined earlier.


- For file in os.listdir(CollPath):
        if file.endswith(".xml"):
            sourcePath = f"{CollPath}/{file}"
            eachFileData = xmlTagger(sourcePath, SortedDict)
- I then send to the xmlTagger to add the nlp info as XML elements and attributes to the source files.        
            
- Flow Chart code 


Text
