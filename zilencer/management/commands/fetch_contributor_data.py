from typing import Any, Dict, List, Optional, Union
from typing_extensions import TypedDict

import os
from time import sleep
from datetime import date
from random import randrange
import logging

from django.core.management.base import CommandParser
from django.conf import settings

from zerver.lib.management import ZulipBaseCommand, CommandError

import requests
import json

duplicate_commits_file = os.path.join(os.path.dirname(__file__), 'duplicate_commits.json')

ContributorsJSON = TypedDict('ContributorsJSON', {
    'date': str,
    'contrib': List[Dict[str, Union[str, int]]],
})

logger = logging.getLogger('zulip.fetch_contributors_json')

class Command(ZulipBaseCommand):
    help = """Fetch contributors data from Github using their API, convert it to structured\
 JSON data for the /team page contributors section."""

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument('--max-retries', type=int, default=10,
                            help='Number of times to retry fetching data from Github')

    def fetch_contributors(self, repo_link: str) -> Optional[List[Dict[str, Dict[str, Any]]]]:
        r = requests.get(repo_link, verify=os.environ.get('CUSTOM_CA_CERTIFICATES'))  # type: requests.Response
        return r.json() if r.status_code == 200 else None

    def write_to_disk(self, json_data: ContributorsJSON, out_file: str) -> None:
        with open(out_file, 'w') as f:
            try:
                f.write("{}\n".format(json.dumps(json_data, indent=2, sort_keys=True)))
            except OSError as e:
                logger.warning(e)
                raise CommandError

    def update_contributor_data_file(self, max_retries: int) -> None:
        print(max_retries)
        """
        Get contributors data from Github and insert them into a temporary
        dictionary. Retry fetching each repository if responded with non HTTP 200
        status.
        """

        # This dictionary should hold all repositories that should be included in
        # the total count, including those that should *not* have tabs on the team
        # page (e.g. if they are deprecated).
        repositories = {
            'server': 'https://api.github.com/repos/zulip/zulip/stats/contributors',
            'desktop': 'https://api.github.com/repos/zulip/zulip-desktop/stats/contributors',
            'mobile': 'https://api.github.com/repos/zulip/zulip-mobile/stats/contributors',
            'python-zulip-api': 'https://api.github.com/repos/zulip/python-zulip-api/stats/contributors',
            'zulip-js': 'https://api.github.com/repos/zulip/zulip-js/stats/contributors',
            'zulipbot': 'https://api.github.com/repos/zulip/zulipbot/stats/contributors',
            'terminal': 'https://api.github.com/repos/zulip/zulip-terminal/stats/contributors',
            'zulip-ios-legacy': 'https://api.github.com/repos/zulip/zulip-ios-legacy/stats/contributors',
            'zulip-android': 'https://api.github.com/repos/zulip/zulip-android/stats/contributors',
        }

        data = dict(date=str(date.today()), contrib=[])  # type: ContributorsJSON
        contribs_list = {}  # type: Dict[str, Dict[str, Union[str, int]]]
        retry_attempts = 0

        while True:
            repos_done = []
            for name, link in repositories.items():
                contribs = self.fetch_contributors(link)
                if contribs:
                    repos_done.append(name)
                    for contrib in contribs:
                        assert contrib is not None  # TODO: To improve/clarify

                        author = contrib.get('author')
                        if author is None:
                            # This happens for users who've deleted their GitHub account.
                            continue

                        username = author.get('login')
                        assert username is not None  # TODO: To improve/clarify

                        avatar = author.get('avatar_url')
                        assert avatar is not None  # TODO: To improve/clarify
                        total = contrib.get('total')
                        assert total is not None  # TODO: To improve/clarify

                        contrib_data = {
                            'avatar': avatar,
                            name: total,
                        }
                        if username in contribs_list:
                            contribs_list[username].update(contrib_data)
                        else:
                            contribs_list[username] = contrib_data
                    retry_attempts = 0
                else:
                    retry_attempts += 1
                    if retry_attempts > max_retries:
                        logger.warning("Failed retries fetching contributors data from Github.")
                        raise CommandError

                    sleep_time = randrange(0, min(64, 2**retry_attempts))
                    sleep(sleep_time)

            # remove duplicate contributions count
            # find commits at the time of split and subtract from zulip-server
            with open(duplicate_commits_file) as f:
                duplicate_commits = json.load(f)
                for committer in duplicate_commits:
                    if committer in contribs_list and contribs_list[committer].get('server'):
                        total_commits = contribs_list[committer]['server']
                        assert isinstance(total_commits, int)
                        duplicate_commits_count = duplicate_commits[committer]
                        original_commits = total_commits - duplicate_commits_count
                        contribs_list[committer]['server'] = original_commits

            for repo in repos_done:
                del repositories[repo]

            if not repositories:
                break

        for contributor_name, contributor_data in contribs_list.items():
            contributor_data['name'] = contributor_name
            data['contrib'].append(contributor_data)

        self.write_to_disk(data, settings.CONTRIBUTOR_DATA_FILE_PATH)

    def handle(self, *args: Any, **options: Any) -> None:
        self.update_contributor_data_file(options["max_retries"])
