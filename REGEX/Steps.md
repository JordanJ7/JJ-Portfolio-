# AutoTagging Exercise 1

First Step: Removed all the the characters that disrupt XML encoding by using find and replace. I found all the "&" characters and replace it with "&amp;" 

Second Step: Found `^.+` and replaced it with `<movie>\0</movie>`

Third Step: Found ``(<movie>)(.+?)\t`` and replaced it with ``\1<title>\2</title>``

Step Four: Found ``(</title>)(.+?)\t`` and replaced with ``\1<year>\2</year>``

Step Four: Found ``(</title>)(.+?)\t`` and replaced with ``\1<year>\2</year>`` 

Note: the find/replace was not working for the runtime portion and nothing after that. 