# 2021-03-03 ebb: I'm adapting a script for downloading videos from GeeksforGeeks.org: https://www.geeksforgeeks.org/downloading-files-web-using-python/
# ebb: Before beginning, go out to your shell (Git Bash or Terminal) and enter:
# pip install BeautifulSoup4
import bs4
import requests
import os

# This variable stores the website address that you want to scrape.
archive_url = "https://www.ishtar-collective.net/books"

def get_tales():
    # create response object
    r = requests.get(archive_url)

    # create beautiful-soup object
    soup = bs4.BeautifulSoup(r.content, 'html.parser')

    # find all links on web-page
    for item in soup.findAll('li'):
        link = item.find('a')
        href = archive_url + link['href']
        download_links(href)
    print("All tales downloaded!")

def download_links(href):
    # obtain filename by splitting url and getting last string
    file_name = href.split('/')[-1]
    print("Downloading file: " + file_name)

    # create response object
    r = requests.get(href, stream = True)

    workingDir = os.getcwd()
    print("current working directory: " + workingDir)
    fileDeposit = os.path.join(workingDir, 'grimmTales', file_name)
    print(fileDeposit)

    # download started
    with open(fileDeposit, 'wb') as f:
        for chunk in r.iter_content(chunk_size = 1024*1024):
            if chunk:
                f.write(chunk)
                print("Downloaded " + file_name)

    return


if __name__ == "__main__":
    # create grimmTales directory if it doesn't exist
    if not os.path.exists('grimmTales'):
        os.makedirs('grimmTales')

    # getting all links to files
    get_tales()






