"""
Bayesian Knowledge Tracing Engine

This figures out the probability that an officer knows a skill
based on their test answers (correct or wrong).
"""


class BKTParams:
    """Settings for one skill."""
    def __init__(self, p_L0=0.3, p_T=0.1, p_G=0.2, p_S=0.1):
        self.p_L0 = p_L0  # Starting chance they already know it
        self.p_T = p_T    # Chance they learn it each time they practice
        self.p_G = p_G    # Chance they guess correctly without knowing
        self.p_S = p_S    # Chance they get it wrong even though they know it


class BKTEngine:
    """The main engine that calculates mastery."""

    def __init__(self):
        self.params = {}

    def get_params(self, skill_id):
        return self.params.get(skill_id, BKTParams())

    def update_mastery(self, skill_id, was_correct):
        """
        Update mastery after one answer.
        
        skill_id:   which skill (e.g., "NAS_001")
        was_correct: True if they got it right, False if wrong
        
        Returns: new probability they know this skill (0.0 to 1.0)
        """
        p = self.get_params(skill_id)
        p_L = p.p_L0

        if was_correct:
            p_obs_L = (1 - p.p_S) * p_L
            p_obs_notL = p.p_G * (1 - p_L)
        else:
            p_obs_L = p.p_S * p_L
            p_obs_notL = (1 - p.p_G) * (1 - p_L)

        denom = p_obs_L + p_obs_notL
        if denom > 0:
            p_L = p_obs_L / denom

        p_L = p_L + (1 - p_L) * p.p_T
        p_L = max(0.0, min(1.0, p_L))

        return round(p_L, 4)

    def compute_mastery_from_history(self, skill_id, history):
        """
        Calculate mastery from a list of past answers.
        
        skill_id: which skill
        history:  list of True/False (e.g., [True, True, False, True])
        
        Returns: final mastery probability
        """
        p = self.get_params(skill_id)
        p_L = p.p_L0

        for correct in history:
            if correct:
                p_obs_L = (1 - p.p_S) * p_L
                p_obs_notL = p.p_G * (1 - p_L)
            else:
                p_obs_L = p.p_S * p_L
                p_obs_notL = (1 - p.p_G) * (1 - p_L)

            denom = p_obs_L + p_obs_notL
            if denom > 0:
                p_L = p_obs_L / denom

            p_L = p_L + (1 - p_L) * p.p_T
            p_L = max(0.0, min(1.0, p_L))

        return round(p_L, 4)