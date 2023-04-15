# STAGE 5: LET'S CLEAN THIS UP: DEALING WITH MESSY NLP TAGGING
# We will try adding an EntityRuler to guide spaCy.
# pip install saxonche
# The library above lets you read and pull data with XPath
import os
import spacy
from spacy.pipeline import EntityRuler
import re as regex
from saxonche import PySaxonProcessor
# ebb: The line above imports the PySaxonProcessor from SaxonCHE (free "home edition")
# for work with XPath


#nlp = spacy.cli.download("en_core_web_lg")
nlp = spacy.load('en_core_web_lg')

###############################################################################
################################################################################
# 1. ebb: Define the paths to the source collection and the target collection.
# We can use a relative path defined from this Python file's location.
##################################################################################
CollPath = '/Users/saojm/github/Star-Wars-project/xml'
TargetPath = './taggedWithAtts'

#########################################################################################
# ebb: After reading the sorted dictionary output, we know spaCy is making some mistakes.
# So, here let's try adding an EntityRuler to customize spaCy's classification. We need
# to configure this BEFORE we send the tokens off to nlp() for processing.
##########################################################################################
# Create the EntityRuler and set it so the ner comes after, so OUR rules take precedence
# Sources:
#   W. J. B. Mattingly: https://ner.pythonhumanities.com/02_01_spaCy_Entity_Ruler.html
#   spaCy documentation on NER Entity Ruler: https://spacy.io/usage/rule-based-matching#entityruler

config = {"spans_key": None, "annotate_ents": True, "overwrite": True, "validate": True}
ruler = nlp.add_pipe("entity_ruler", after="ner", config={"validate": True})
ruler = nlp.add_pipe("span_ruler", before="ner", config=config)
# Notes: Mattingly has this: ruler = nlp.add_pipe("entity_ruler", after="ner", config={"validate": True})
# But this only works when spaCy doesn't recognize a word / phrase as a named entity of any kind.
# If it recognizes a named entity but tags it wrong, we correct it with the span_ruler, not the entity_ruler
patterns = [
    {"label": "ORG", "pattern": "ARTOO"},
    {"label": "ORG", "pattern": "Alderaan"},
    {"label": "ORG", "pattern": "Alliance"},
    {"label": "GPE", "pattern": "Anakin"},
    {"label": "GPE", "pattern": "Antilles"},
    {"label": "ORG", "pattern": "Army"},
    {"label": "GPE", "pattern": "Artoo"},
    {"label": "ORG", "pattern": "Astro"},
    {"label": "ORG", "pattern": "Autopilot"},
    {"label": "ORG", "pattern": "Bail Organa of Alderaan"},
    {"label": "ORG", "pattern": "Banthas"},
    {"label": "ORG", "pattern": "Battle Droids"},
    {"label": "ORG", "pattern": "Bazda"},
    {"label": "ORG", "pattern": "Bear Clan"},
    {"label": "ORG", "pattern": "Bongo du bongu"},
    {"label": "ORG", "pattern": "Boonta"},
    {"label": "ORG", "pattern": "Boonta Eve"},
    {"label": "NORP", "pattern": "Bothan"},
    {"label": "NORP", "pattern": "Bothans"},
    {"label": "ORG", "pattern": "Bravo Leader"},
    {"label": "ORG", "pattern": "CONCORKILL"},
    {"label": "FAC", "pattern": "Camp Four"},
    {"label": "ORG", "pattern": "CaptainI"},
    {"label": "LOC", "pattern": "Carkoon"},
    {"label": "ORG", "pattern": "Clone Troopers"},
    {"label": "ORG", "pattern": "Congress"},
    {"label": "GPE", "pattern": "Coruscant"},
    {"label": "NORP", "pattern": "Coucil"},
    {"label": "ORG", "pattern": "Council"},
    {"label": "ORG", "pattern": "Count Dooku"},
    {"label": "ORG", "pattern": "Count Dooku's"},
    {"label": "ORG", "pattern": "Count Dooku?His"},
    {"label": "ORG", "pattern": "Courscant"},
    {"label": "FAC", "pattern": "Dagobah"},
    {"label": "GPE", "pattern": "Diplodiaclect"},
    {"label": "ORG", "pattern": "Dooku"},
    {"label": "FAC", "pattern": "Echo Seven"},
    {"label": "FAC", "pattern": "Echo Station Three-T-Eight.(over"},
    {"label": "ORG", "pattern": "Ello"},
    {"label": "GPE", "pattern": "Empire"},
    {"label": "ORG", "pattern": "Falcon"},
    {"label": "ORG", "pattern": "Federation"},
    {"label": "ORG", "pattern": "Force"},
    {"label": "GPE", "pattern": "Furbog"},
    {"label": "GPE", "pattern": "Galactic Empire"},
    {"label": "ORG", "pattern": "General Veers"},
    {"label": "NORP", "pattern": "Geonosian"},
    {"label": "NORP", "pattern": "Geonosians"},
    {"label": "ORG", "pattern": "Gold Group"},
    {"label": "ORG", "pattern": "Gold Leader"},
    {"label": "ORG", "pattern": "Gray"},
    {"label": "ORG", "pattern": "Green Group"},
    {"label": "ORG", "pattern": "Guilds"},
    {"label": "ORG", "pattern": "Gundark"},
    {"label": "GPE", "pattern": "Gungan city"},
    {"label": "NORP", "pattern": "Gungans"},
    {"label": "NORP", "pattern": "Han"},
    {"label": "ORG", "pattern": "Hobbie"},
    {"label": "GPE", "pattern": "Hoth"},
    {"label": "ORG", "pattern": "Hut"},
    {"label": "NORP", "pattern": "Huttese"},
    {"label": "GPE", "pattern": "Hutts"},
    {"label": "ORG", "pattern": "IBecause"},
    {"label": "LOC", "pattern": "Iego"},
    {"label": "ORG", "pattern": "Imperial"},
    {"label": "ORG", "pattern": "Imperial Star Destroyer"},
    {"label": "ORG", "pattern": "Imperial Starfleet"},
    {"label": "ORG", "pattern": "Inkabunga"},
    {"label": "ORG", "pattern": "Isuggest"},
    {"label": "ORG", "pattern": "JAR"},
    {"label": "GPE", "pattern": "Jango"},
    {"label": "GPE", "pattern": "Jar Jar"},
    {"label": "ORG", "pattern": "Jar Jar Binks!Mesa"},
    {"label": "ORG", "pattern": "Jedi"},
    {"label": "GPE", "pattern": "Jedi Kights"},
    {"label": "GPE", "pattern": "Jev Narran's"},
    {"label": "FAC", "pattern": "Kamino"},
    {"label": "ORG", "pattern": "Kenobi"},
    {"label": "ORG", "pattern": "Knights"},
    {"label": "GPE", "pattern": "Lando"},
    {"label": "GPE", "pattern": "Lando Calrissian.(into"},
    {"label": "GPE", "pattern": "MALEDEE"},
    {"label": "ORG", "pattern": "Magnetize"},
    {"label": "ORG", "pattern": "Majaesty"},
    {"label": "ORG", "pattern": "Mesa"},
    {"label": "ORG", "pattern": "Mesa back!Noah"},
    {"label": "GPE", "pattern": "Mmmm"},
    {"label": "ORG", "pattern": "Monstairs back!Wesa"},
    {"label": "ORG", "pattern": "NEE ALAVAR"},
    {"label": "ORG", "pattern": "Naboo"},
    {"label": "ORG", "pattern": "Natoota"},
    {"label": "ORG", "pattern": "Nooooooo"},
    {"label": "LOC", "pattern": "North"},
    {"label": "GPE", "pattern": "Nosir"},
    {"label": "NORP", "pattern": "Nubian"},
    {"label": "ORG", "pattern": "Nute Gunray"},
    {"label": "ORG", "pattern": "OOM-9"},
    {"label": "ORG", "pattern": "Ody Mandrell"},
    {"label": "NORP", "pattern": "Ootmians"},
    {"label": "ORG", "pattern": "Order"},
    {"label": "LOC", "pattern": "Our Clone Intelligence Units"},
    {"label": "LOC", "pattern": "Outer Rim"},
    {"label": "ORG", "pattern": "Outlanders"},
    {"label": "NORP", "pattern": "Padm"},
    {"label": "GPE", "pattern": "Palo"},
    {"label": "ORG", "pattern": "Poddraces"},
    {"label": "NORP", "pattern": "Punda"},
    {"label": "ORG", "pattern": "Qui-Gon"},
    {"label": "ORG", "pattern": "Qui-Gon Jinn"},
    {"label": "ORG", "pattern": "Qui-Gon's"},
    {"label": "ORG", "pattern": "Rebels"},
    {"label": "ORG", "pattern": "Red Group"},
    {"label": "ORG", "pattern": "Red Leader"},
    {"label": "ORG", "pattern": "Red Two"},
    {"label": "ORG", "pattern": "Republiv"},
    {"label": "ORG", "pattern": "Rogue"},
    {"label": "ORG", "pattern": "Rogue Group"},
    {"label": "ORG", "pattern": "Rogue Leader(over"},
    {"label": "ORG", "pattern": "Rogue Two"},
    {"label": "ORG", "pattern": "Rootleaf"},
    {"label": "FAC", "pattern": "ST 321"},
    {"label": "LOC", "pattern": "Sebulba"},
    {"label": "ORG", "pattern": "Senate"},
    {"label": "ORG", "pattern": "Senatorial"},
    {"label": "NORP", "pattern": "Separatist"},
    {"label": "NORP", "pattern": "Separatists"},
    {"label": "NORP", "pattern": "Spreme"},
    {"label": "ORG", "pattern": "Star Destroyer"},
    {"label": "ORG", "pattern": "Star Destroyers"},
    {"label": "NORP", "pattern": "Steady"},
    {"label": "ORG", "pattern": "Steeth pa nagoola"},
    {"label": "ORG", "pattern": "Stow"},
    {"label": "ORG", "pattern": "Super Star Destroyer"},
    {"label": "ORG", "pattern": "Supreme"},
    {"label": "ORG", "pattern": "TIE"},
    {"label": "GPE", "pattern": "Tarfful"},
    {"label": "ORG", "pattern": "Target"},
    {"label": "ORG", "pattern": "The Commerce Guilds"},
    {"label": "ORG", "pattern": "The Congress of Malastare"},
    {"label": "ORG", "pattern": "The Federation Army's"},
    {"label": "ORG", "pattern": "The Jedi Council"},
    {"label": "ORG", "pattern": "The Jedi Order"},
    {"label": "LOC", "pattern": "The Lake Country"},
    {"label": "ORG", "pattern": "The Trade Federation"},
    {"label": "ORG", "pattern": "Threepio"},
    {"label": "GPE", "pattern": "Tibanna"},
    {"label": "GPE", "pattern": "Tipoca City"},
    {"label": "NORP", "pattern": "Toydarian"},
    {"label": "GPE", "pattern": "Trade Federation"},
    {"label": "GPE", "pattern": "Tund"},
    {"label": "ORG", "pattern": "Tusekn Raiders"},
    {"label": "ORG", "pattern": "Tusken Riaders"},
    {"label": "GPE", "pattern": "Utapau"},
    {"label": "ORG", "pattern": "Valorum as Supreme"},
    {"label": "ORG", "pattern": "Wampa peedunkee unko"},
    {"label": "ORG", "pattern": "Weehoo"},
    {"label": "ORG", "pattern": "Whooha"},
    {"label": "NORP", "pattern": "Wookie"},
]
ruler.add_patterns(patterns)

# 3. Here, the function imports each individual file, one at a time
# (received from the for-loop below.
def readTextFiles(filepath):
    # with open(filepath, 'r', encoding='utf8') as f:
    with PySaxonProcessor(license=False) as proc:
        xml = open(filepath, encoding='utf-8').read()
        # ebb: Here we changed to the Saxon processor to read files with XPath.
        # From here on, we change how we formulate the string that Python will send to NLP.
        xp = proc.new_xpath_processor()
        node = proc.parse_xml(xml_text=xml)
        xp.set_context(xdm_item=node)

        xpath = xp.evaluate('(//crawl | //sp/text() ) ! normalize-space() => string-join()')
        # ebb: Let's get the string() value of all the <p> elements that are descendants of <book>.
        # The XPath function normalize-space() gets the string value and removes extra spaces.
        # That way we avoid the prologue, preface material.
        # I'm sending the whole thing to string-join() to bundle it together as one string
        # instead of a new string for every <p> element.
        # string = xpath.__str__()
        string = str(xpath)
        # ebb: Doing some regex replacements to clean up punctuation issues that are getting in the way of the NER tagger
        cleanedUp = regex.sub("_", " ", string)
        cleanedUp = regex.sub(r"'([A-Z])]", r" \1", cleanedUp)
        cleanedUp = regex.sub(r"([.!?;'`])([A-Z'`]])", r"\1 \2", cleanedUp)
        # send to spaCy to collect nlp data on the big string
        tokens = nlp(cleanedUp)
        # tokens = nlp.pipe(cleanedUp, disable=["tagger", "parser", "attribute_ruler", "lemmatizer"])

        dictEntities = entitycollector(tokens)
        # ebb: The line above sends our nlp tokens to the named entity collector function.
        # THIS current function will receive and print a simple form of their output in the next line.
        print(f"{dictEntities=}")
        return(dictEntities)

#########################################################################################
# ebb: NEXT AFTER RETURNING ALL THE ENTITIES
# Remove duplicates (get the distinct values of the list of entities
# Output this information in a useful way
# Map it back into the XML files
# GO LOOK AT 2. and 5. below: functions involved: assemblAllNames and xmlTagger
##########################################################################################

# 4. ebb: The function below returns a simple list of named entities.
# But on the way, we're printing out as much we can from spaCy's classification of named entities:
def entitycollector(tokens):
    entities = {}
    for ent in sorted(tokens.ents):
        if ent.label_ == "LOC" or ent.label_=="FAC" or ent.label_=="ORG" or ent.label_=="GPE" or ent.label_=="NORP":
            if not regex.match(r"\w*[.,!?;:']\w*", ent.text):
        # ebb: The line helps experiment with different spaCy named entity classifiers, in combination if you like:
        # When using it, remember to indent the next lines for the for loop.
                #stringify = (ent.text + ': ' + ent.label_ + ': ' + spacy.explain(ent.label_) + '\n')
                #stringify is a string-formatted version of this designed to provide an easily readable file output.
                #print(f"{stringify=}")
                entities[ent.text] = ent.label_
    print(f"{entities=}")
    return entities
    # ebb: Keep the return line in position at same indentation level as the definition of the entities variable.


# 2. and 5. ebb: The for loop below is working with your CollPath, and going through each file inside,
# and sending it up to readTextFiles, where the nlp processing will happen.
def assembleAllNames(CollPath):
    AllNames = {}
    for file in os.listdir(CollPath):
        if file.endswith(".xml"):
            filepath = f"{CollPath}/{file}"

            eachFileDict = readTextFiles(filepath)
            print(f"{eachFileDict=}")
            AllNames.update(eachFileDict)
            # ebb: The line above adds each file's new NLP data to the dictionary.

    print(f"{AllNames=}")
    AllNamesKeys = list(AllNames.keys())
    AllNamesKeys.sort()
    SortedDict =  {i: AllNames[i] for i in AllNamesKeys}
    print(f"{SortedDict=}")
    writeSortedEntries(SortedDict)
        # ebb: The function call in the above line will print the file to a useful output for review.
        # In a previous version of this file, we were printing the entire dictionary out to a file, and it was printing all the entries
        # out in one extremely long line. So I defined a simple function that will
        # output each entry as a string, line-by-line in the output file so the entries are easy
        # to read and review. We keep the dictionary as key-value pairs to send on to the xmlTagger function.

    for file in os.listdir(CollPath):
        if file.endswith(".xml"):
            sourcePath = f"{CollPath}/{file}"
            eachFileData = xmlTagger(sourcePath, SortedDict)
            # ebb: In the lines above, we send to the xmlTagger to add the nlp info as XML elements and attributes to the source files.
    return eachFileData
    # Python functions don't really need to have return lines, but we can set the return to the function's most important output.

def writeSortedEntries(dictionary):
    with open('distTrained-ORG-LOC-GPE-NORP.txt', 'w') as f:
        for key, value in dictionary.items():
            f.write(key + ' : ' + value + '\n')
def xmlTagger(sourcePath, SortedDict):
    with open(sourcePath, 'r', encoding='utf8') as f:
        readFile = f.read()
        stringFile = str(readFile)

        # ebb: Get the current filename. We need to know it to write its new output version
        filename = os.path.basename(f.name)
        print(f"{filename=}")
        targetFile = f"{TargetPath}/{filename}"
        print(f"{targetFile=}")

        # ebb: Work with stringFile variable to look for matches from the distinctNames set.
        for key, val in SortedDict.items():
            replacement = '<name type="' + val + '">' + key + '</name>'
            # print(f"{replacement=}")
            stringFile = stringFile.replace(key, replacement)
            # print(f"{stringFile=}")

        # ebb: Output goes in the taggedOutput directory: ../taggedOutput
        with open(targetFile, 'w') as f:
            f.write(stringFile)

assembleAllNames(CollPath)

# ebb: The functions are all initiated here now.
# This just delivers the collection path up to the first function in the sequence.