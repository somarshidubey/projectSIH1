"""
iGOT Karmayogi Server-to-Server Client
---------------------------------------
Production-grade OAuth2 client-credentials integration with the iGOT
Karmayogi portal.  Provides officer profile lookup, course catalog
fetching with resolved hyperlinks, and department competency mapping.

When IGOT_CLIENT_ID is not set the client operates in *mock mode*,
returning static data from data/officer_profiles.json and
data/igot_courses.json.
"""

import json
import os
import time
from pathlib import Path

# ------------------------------------------------------------------ #
# Optional HTTP transport — httpx preferred, urllib fallback
# ------------------------------------------------------------------ #

try:
    import httpx as _httpx

    def _fetch_json(url, headers=None, timeout=10):
        resp = _httpx.get(url, headers=headers, timeout=timeout)
        resp.raise_for_status()
        return resp.json()

    def _post_form(url, data=None, headers=None, timeout=10):
        resp = _httpx.post(url, data=data, headers=headers, timeout=timeout)
        resp.raise_for_status()
        return resp.json()
except ImportError:
    try:
        from urllib.request import Request, urlopen
        import urllib.error
        import urllib.parse

        def _fetch_json(url, headers=None, timeout=10):
            req = Request(url, headers=headers or {}, method="GET")
            with urlopen(req, timeout=timeout) as resp:
                return json.loads(resp.read().decode())

        def _post_form(url, data=None, headers=None, timeout=10):
            encoded = urllib.parse.urlencode(data or {}).encode()
            req = Request(url, data=encoded, headers=headers or {}, method="POST")
            req.add_header("Content-Type", "application/x-www-form-urlencoded")
            with urlopen(req, timeout=timeout) as resp:
                return json.loads(resp.read().decode())
    except ImportError:
        def _fetch_json(url, headers=None, timeout=10):
            return None

        def _post_form(url, data=None, headers=None, timeout=10):
            return None


# ------------------------------------------------------------------ #
# Environment configuration
# ------------------------------------------------------------------ #

IGOT_CLIENT_ID = os.environ.get("IGOT_CLIENT_ID", "")
IGOT_CLIENT_SECRET = os.environ.get("IGOT_CLIENT_SECRET", "")
IGOT_BASE_URL = os.environ.get("IGOT_BASE_URL", "https://portal.karmayogi.nic.in")

IGOT_AUTH_ENDPOINT = os.environ.get(
    "IGOT_AUTH_ENDPOINT",
    f"{IGOT_BASE_URL.rstrip('/')}/auth/realms/sunbird-ic/protocol/openid-connect/token",
)
IGOT_COURSES_ENDPOINT = os.environ.get(
    "IGOT_COURSES_ENDPOINT",
    f"{IGOT_BASE_URL.rstrip('/')}/apis/protected/v8/course/list",
)
IGOT_PROFILE_ENDPOINT = os.environ.get(
    "IGOT_PROFILE_ENDPOINT",
    f"{IGOT_BASE_URL.rstrip('/')}/apis/protected/v8/user/viewprofile",
)


# ------------------------------------------------------------------ #
# Static profile + course data
# ------------------------------------------------------------------ #

_DATA_DIR = Path(__file__).parent.parent / "data"
_STATIC_PROFILES_PATH = _DATA_DIR / "officer_profiles.json"
_STATIC_COURSES_PATH = _DATA_DIR / "igot_courses.json"


def _load_static_profiles():
    with open(_STATIC_PROFILES_PATH, encoding="utf-8") as f:
        return json.load(f)


def _load_static_courses():
    with open(_STATIC_COURSES_PATH, encoding="utf-8") as f:
        return json.load(f)


# ------------------------------------------------------------------ #
# OAuth2 Token Manager
# ------------------------------------------------------------------ #

class IGOTTokenManager:
    """Manages OAuth2 client-credentials tokens for iGOT Karmayogi.

    Caches the token and its expiry timestamp.  Automatically refreshes
    60 seconds before the stored token expires.
    """

    def __init__(self, client_id: str, client_secret: str, token_url: str):
        self._client_id = client_id
        self._client_secret = client_secret
        self._token_url = token_url
        self._token: str | None = None
        self._expires_at: float = 0.0

    def get_access_token(self) -> str | None:
        """Return a valid Bearer token, refreshing if necessary.

        Returns ``None`` when running in mock mode (no credentials).
        """
        if not self._client_id or not self._client_secret:
            return None

        # Refresh if within 60 s of expiry
        if self._token and time.time() < self._expires_at - 60:
            return self._token

        return self._refresh()

    def _refresh(self) -> str | None:
        """Perform the client-credentials token exchange."""
        try:
            data = {
                "grant_type": "client_credentials",
                "client_id": self._client_id,
                "client_secret": self._client_secret,
            }
            result = _post_form(self._token_url, data=data, timeout=10)
            if result and "access_token" in result:
                self._token = result["access_token"]
                self._expires_at = time.time() + int(result.get("expires_in", 3600))
                return self._token
        except Exception:
            pass
        return None


# ------------------------------------------------------------------ #
# Client
# ------------------------------------------------------------------ #

class IGOTClient:
    """Server-to-server iGOT Karmayogi client.

    Public API shape preserved for backward compatibility:
    - get_officer_profile(officer_id)
    - get_department_competencies(department)

    New methods:
    - get_courses(competency_id)
    - get_officer_courses(officer_id)
    """

    def __init__(self):
        self._static = _load_static_profiles()
        self._static_courses = _load_static_courses()
        self.profiles: dict = self._static.get("profiles", {})
        self.dept_competencies: dict = self._static.get("department_competencies", {})

        # OAuth2 token manager (None when no credentials are set)
        self.token_manager: IGOTTokenManager | None = None
        if IGOT_CLIENT_ID:
            self.token_manager = IGOTTokenManager(
                client_id=IGOT_CLIENT_ID,
                client_secret=IGOT_CLIENT_SECRET,
                token_url=IGOT_AUTH_ENDPOINT,
            )

    # ------------------------------------------------------------------ #
    # Public API
    # ------------------------------------------------------------------ #

    def get_officer_profile(self, officer_id: str) -> dict:
        """Return the officer profile dict, preferring live data when configured.

        When IGOT_CLIENT_ID is set, attempts a live fetch with Bearer
        authentication.  Falls back silently to mock data on any failure.
        """
        if self.token_manager:
            live = self._fetch_live_profile(officer_id)
            if live:
                return live

        mock = self.profiles.get(officer_id)
        if mock is None:
            return self._synthetic_profile(officer_id)
        return dict(mock)

    def get_department_competencies(self, department: str) -> list[str]:
        """Return competency IDs commonly associated with a department.

        Tries exact match first, then substring match against known keys.
        """
        exact = self.dept_competencies.get(department, [])
        if exact:
            return list(exact)
        dept_lower = department.lower()
        for key, comp_ids in self.dept_competencies.items():
            if dept_lower in key.lower() or key.lower() in dept_lower:
                return list(comp_ids)
        return []

    def get_courses(self, competency_id: str | None = None) -> list[dict]:
        """Return courses from the iGOT catalog with resolved hyperlinks.

        When IGOT_CLIENT_ID is set, fetches from the live catalog endpoint.
        Falls back to the static JSON file on failure.
        Courses returned include a ``url`` field pointing to the live
        iGOT Karmayogi page.
        """
        courses = self._fetch_live_courses() or self._mock_courses()
        if competency_id:
            courses = [c for c in courses if competency_id in (c.get("competency_tags") or [])]
        return courses

    def get_officer_courses(self, officer_id: str) -> list[dict]:
        """Return courses recommended for this officer based on their profile.

        Uses the officer's department competencies to filter the catalog.
        """
        profile = self.get_officer_profile(officer_id)
        dept = profile.get("department_name", "")
        dept_comps = self.get_department_competencies(dept)
        all_courses = self.get_courses()
        if not dept_comps:
            return all_courses
        recommended = []
        for course in all_courses:
            tags = course.get("competency_tags") or []
            if any(t in dept_comps for t in tags):
                recommended.append(course)
        return recommended if recommended else all_courses

    # ------------------------------------------------------------------ #
    # Live fetch helpers
    # ------------------------------------------------------------------ #

    def _fetch_live_profile(self, officer_id: str) -> dict | None:
        """Fetch a live profile using Bearer authentication."""
        try:
            token = self.token_manager.get_access_token()
            if not token:
                return None
            headers = {"Authorization": f"Bearer {token}"}
            url = f"{IGOT_PROFILE_ENDPOINT}/{officer_id}"
            raw = _fetch_json(url, headers=headers, timeout=10)
            if raw and isinstance(raw, dict):
                return self._normalise_live_profile(raw)
        except Exception:
            pass
        return None

    def _fetch_live_courses(self) -> list[dict] | None:
        """Fetch courses from the live iGOT catalog endpoint."""
        try:
            token = self.token_manager.get_access_token()
            if not token:
                return None
            headers = {"Authorization": f"Bearer {token}"}
            raw = _fetch_json(IGOT_COURSES_ENDPOINT, headers=headers, timeout=10)
            if raw and isinstance(raw, (list, dict)):
                items = raw if isinstance(raw, list) else raw.get("result", raw.get("courses", []))
                return self._normalise_live_courses(items)
        except Exception:
            pass
        return None

    # ------------------------------------------------------------------ #
    # Normalisation helpers
    # ------------------------------------------------------------------ #

    @staticmethod
    def _normalise_live_profile(raw: dict) -> dict:
        """Map iGOT raw profile fields to the normalised schema."""
        return {
            "wid": raw.get("wid", ""),
            "username": raw.get("username", ""),
            "first_name": raw.get("first_name", ""),
            "last_name": raw.get("last_name", ""),
            "known_as": raw.get("known_as", raw.get("first_name", "")),
            "email": raw.get("email", ""),
            "job_title": raw.get("job_title", ""),
            "job_role": raw.get("job_role", "statistical_officer"),
            "department_name": raw.get("department_name", "MoSPI"),
            "sub_department_name": raw.get("sub_department_name", ""),
            "unit_name": raw.get("unit_name", ""),
            "organization_location_state": raw.get("organization_location_state", ""),
            "organization_location_city": raw.get("organization_location_city", ""),
            "language_preference": raw.get("preferred_language", "English"),
            "competency_history": {},
            "avatar": (raw.get("first_name", "?")[:1] + raw.get("last_name", "?")[:1]).upper(),
        }

    @staticmethod
    def _normalise_live_courses(raw_items: list) -> list[dict]:
        """Normalise raw iGOT catalog items into the standard course dict."""
        courses = []
        for item in raw_items:
            course_id = item.get("identifier") or item.get("course_id") or item.get("id", "")
            raw_url = item.get("url") or item.get("link") or ""
            resolved_url = IGOTClient.resolve_course_url(course_id, raw_url)
            courses.append({
                "course_id": str(course_id),
                "title": item.get("title") or item.get("name", "Untitled Course"),
                "description": item.get("description", ""),
                "competency_tags": item.get("competency_tags") or item.get("competencies", []),
                "url": resolved_url,
                "source": "iGOT Karmayogi (live)",
            })
        return courses

    # ------------------------------------------------------------------ #
    # Course URL resolution
    # ------------------------------------------------------------------ #

    @staticmethod
    def resolve_course_url(course_id: str | None = None, raw_url: str = "") -> str:
        """Resolve a course ID / raw URL into a full iGOT Karmayogi hyperlink.

        If a ``course_id`` is provided, constructs the canonical URL.
        Otherwise returns the raw URL as-is (defaulting to the portal
        homepage).
        """
        if course_id:
            return f"{IGOT_BASE_URL.rstrip('/')}/app/learn/{course_id}"
        if raw_url and raw_url.startswith("http"):
            return raw_url
        return f"{IGOT_BASE_URL.rstrip('/')}/app/learn/{course_id}" if course_id else IGOT_BASE_URL

    # ------------------------------------------------------------------ #
    # Mock data helpers
    # ------------------------------------------------------------------ #

    def _mock_courses(self) -> list[dict]:
        """Return mock courses with resolved URLs."""
        raw = self._static_courses
        if isinstance(raw, dict):
            raw = raw.get("courses", raw.get("result", []))
        courses = []
        for item in raw:
            course_id = item.get("course_id") or item.get("identifier", "")
            raw_url = item.get("url", "")
            courses.append({
                "course_id": str(course_id),
                "title": item.get("title") or item.get("name", "Untitled"),
                "description": item.get("description", ""),
                "competency_tags": item.get("competency_tags") or [],
                "url": self.resolve_course_url(course_id, raw_url),
                "source": "Saksham (mock)",
            })
        return courses

    def _synthetic_profile(self, officer_id: str) -> dict:
        """Create a minimal fallback profile for unknown officers."""
        return {
            "wid": f"synth-{officer_id}",
            "username": officer_id,
            "first_name": "Officer",
            "last_name": "",
            "known_as": officer_id,
            "email": f"{officer_id.lower()}@mospi.gov.in",
            "job_title": "Statistical Officer",
            "job_role": "statistical_officer",
            "department_name": "MoSPI",
            "sub_department_name": "",
            "unit_name": "",
            "organization_location_state": "Delhi",
            "organization_location_city": "New Delhi",
            "language_preference": "English",
            "competency_history": {},
            "avatar": officer_id[:2].upper(),
        }
