from django.db import models
from django.core import validators
from django.contrib.auth import get_user_model
import uuid

from registration.validators import UploadedFileValidator

User = get_user_model()


def _generate_team_code():
    team_code = uuid.uuid4().hex[:5].upper()
    while Team.objects.filter(team_code=team_code).exists():
        team_code = uuid.uuid4().hex[:5].upper()
    return team_code


class Team(models.Model):
    team_code = models.CharField(max_length=5, default=_generate_team_code, null=False)

    created_at = models.DateTimeField(auto_now_add=True, null=False)
    updated_at = models.DateTimeField(auto_now=True, null=False)

    MAX_MEMBERS = 4

    def __str__(self):
        return self.team_code


class Application(models.Model):
    GENDER_CHOICES = [
        (None, ""),
        ("male", "Male"),
        ("female", "Female"),
        ("non-binary", "Non-binary"),
        ("other", "Other"),
        ("no-answer", "Prefer not to answer"),
    ]

    PRONOUNS_CHOICES = [
        (None, ""),
        ("she-her", "She/Her"),
        ("he-him", "He/Him"),
        ("they-them", "They/Them"),
        ("she-they", "She/They"),
        ("he-they", "He/They"),
        ("no-answer", "Prefer not to Answer"),
        ("other", "Other"),
    ]
    HACKATHON_NUMBER_CHOICES = [
        (None, ""),
        ("0", "0"),
        ("1", "1"),
        ("2", "2"),
        ("3", "3"),
        ("4", "4"),
        ("5 or more", "5 or more"),
    ]

    AGE_CHOICES = [
        (None, ""),
        ("18", "18"),
        ("19", "19"),
        ("20", "20"),
        ("21", "21"),
        ("22", "22"),
        ("22+", "22+"),
    ]

    ETHNICITY_CHOICES = [
        (None, ""),
        ("asian-indian", "Asian Indian"),
        ("black-african-american", "Black or African American"),
        ("chinese", "Chinese"),
        ("filipino", "Filipino"),
        ("guamanian-chamorro", "Guamanian or Chamorro"),
        ("hispanic-latino", "Hispanic/Latino/Spanish Origin"),
        ("japanese", "Japanese"),
        ("korean", "Korean"),
        ("middle-eastern", "Middle Eastern"),
        ("native-american", "Native American or Alaskan Native"),
        ("native-hawaiian", "Native Hawaiian"),
        ("samoan", "Samoan"),
        ("vietnamese", "Vietnamese"),
        ("caucasian", "White / Caucasian"),
        ("other-asian", "Other Asian (Thai, Cambodian, etc)"),
        ("other-pacific-islander", "Other Pacific Islander"),
        ("other", "Other (Please Specify)"),
        ("no-answer", "Prefer not to answer"),
    ]

    REFERRAL_CHOICES = [
        (None, ""),
        ("instagram", "Instagram"),
        ("in class/from a professor", "In Class/From a professor"),
        ("discord", "Discord"),
        ("email", "Email"),
        ("from a friend", "From a friend"),
        ("other", "Other"),
    ]

    STUDY_LEVEL_CHOICES = [
        (None, ""),
        ("less-highschool", "Less than Secondary/High School"),
        ("highschool", "Secondary/High School"),
        (
            "undergraduate-twoyears",
            "Undergraduate University (2 year - community college or similar)",
        ),
        ("undergraduate-threeyears", "Undergraduate University (3+ year)"),
        ("gradschool", "Graduate University (Masters, Professional, Doctoral, etc) "),
        ("postdoctorate", "Post Doctorate"),
        ("codeschool", "Code School/Bootcamp"),
        ("other-apprenticeship", "Other Vocational / Trade Program or Apprenticeship"),
        ("other", "Other (Please Specify)"),
        ("not-student", "I'm not currently a student"),
        ("no-answer", "Prefer not to answer"),
    ]

    TSHIRT_SIZE_CHOICES = [
        (None, ""),
        ("S", "S"),
        ("M", "M"),
        ("L", "L"),
        ("XL", "XL"),
    ]

    DIETARY_RESTRICTIONS_CHOICES = [
        (None, ""),
        ("none", "None"),
        ("halal", "Halal"),
        ("vegetarian", "Vegetarian"),
        ("gluten-Free", "Gluten-free"),
        ("other but specify", "Other but Specify"),
    ]

    YES_NO_UNSURE = [
        (None, ""),
        ("yes", "Yes"),
        ("no", "No"),
        ("unsure", "Unsure"),
    ]

    SEXUALITY = [
        (None, ""),
        ("straight", "Heterosexual or straight"),
        ("gay-lesbian", "Gay or lesbian"),
        ("bisexual", "Bisexual"),
        ("different", "Different Identity (Please Specify"),
        ("no-answer", "Prefer not to answer"),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, null=False)
    team = models.ForeignKey(
        Team, related_name="applications", on_delete=models.CASCADE, null=False
    )

    # User Submitted Fields
    age = models.CharField(max_length=50, choices=AGE_CHOICES, null=False)
    gender = models.CharField(max_length=50, choices=GENDER_CHOICES, null=False)
    pronouns = models.CharField(max_length=50, choices=PRONOUNS_CHOICES, null=False)
    ethnicity = models.CharField(max_length=50, choices=ETHNICITY_CHOICES, null=False)
    country = models.CharField(max_length=255, null=False)
    dietary_restrictions = models.CharField(
        max_length=50, choices=DIETARY_RESTRICTIONS_CHOICES, null=False
    )
    tshirt_size = models.CharField(
        max_length=50, choices=TSHIRT_SIZE_CHOICES, null=False
    )

    school = models.CharField(max_length=255, null=False)
    phone_number = models.CharField(
        max_length=20,
        null=False,
        validators=[
            validators.RegexValidator(
                r"^(?:\+\d{1,3})?\s?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4}$",
                message="Enter a valid phone number.",
            )
        ],
    )

    study_level = models.CharField(
        max_length=50, choices=STUDY_LEVEL_CHOICES, null=False
    )
    program = models.CharField(
        max_length=255, help_text="Program or Major", null=False, default=""
    )
    graduation_year = models.IntegerField(
        null=False,
        validators=[
            validators.MinValueValidator(
                2000, message="Enter a realistic graduation year."
            ),
            validators.MaxValueValidator(
                2030, message="Enter a realistic graduation year."
            ),
        ],
    )
    resume = models.FileField(
        upload_to="applications/resumes/",
        validators=[
            UploadedFileValidator(
                content_types=["application/pdf"], max_upload_size=20 * 1024 * 1024
            )
        ],
        null=False,
    )
    linkedin = models.URLField(
        max_length=200, help_text="LinkedIn Profile (Optional)", null=True, blank=True
    )
    github = models.URLField(
        max_length=200, help_text="Github Profile (Optional)", null=True, blank=True
    )
    devpost = models.URLField(
        max_length=200, help_text="Devpost Profile (Optional)", null=True, blank=True
    )
    how_many_hackathons = models.TextField(
        null=False,
        help_text="How many hackathons have you been to?",
        choices=HACKATHON_NUMBER_CHOICES,
        max_length=100,
    )
    what_hackathon_experience = models.TextField(
        null=False,
        help_text="If you’ve been to a hackathon, briefly tell "
        "us your experience. If not, describe what you"
        " expect to see and experience.",
        max_length=1000,
    )
    why_participate = models.TextField(
        null=False,
        help_text="Why do you want to participate in MakeUofT?",
        max_length=1000,
    )
    what_technical_experience = models.TextField(
        null=False,
        help_text="What is your technical experience with software and hardware?",
        max_length=1000,
    )
    discovery_method = models.TextField(
        null=False,
        help_text="How did you hear about MakeUofT?",
        choices=REFERRAL_CHOICES,
        max_length=100,
    )

    underrepresented_community = models.CharField(
        null=False,
        help_text="Do you identify as a part of an underrepresented group in the technology industry?",
        choices=YES_NO_UNSURE,
        max_length=1000,
    )

    sexual_orientation = models.CharField(
        null=False,
        help_text="Do you consider yourself to be any of the following?",
        choices=SEXUALITY,
        max_length=1000,
    )

    conduct_agree = models.BooleanField(
        help_text="I have read and agree to the "
        '<a href="https://static.mlh.io/docs/mlh-code-of-conduct.pdf" rel="noopener noreferrer" target="_blank">MLH code of conduct</a>.',
        blank=False,
        null=False,
        default=False,
    )
    logistics_agree = models.BooleanField(
        help_text="I authorize you to share my application/registration information with Major League Hacking"
        " for event administration, ranking, and MLH administration in-line with the "
        '<a href="https://mlh.io/privacy" rel="noopener noreferrer" target="_blank">MLH Privacy Policy</a>. '
        "I further agree to the terms of both the "
        '<a href="https://github.com/MLH/mlh-policies/blob/main/contest-terms.md" rel="noopener noreferrer" target="_blank">MLH Contest Terms and Conditions</a>'
        " and the "
        '<a href="https://mlh.io/privacy" rel="noopener noreferrer" target="_blank">MLH Privacy Policy.</a>',
        blank=False,
        null=False,
        default=False,
    )

    email_agree = models.BooleanField(
        help_text="I authorize MLH to send me pre- and post-event informational"
        " emails, which contain free credit and opportunities from their partners.",
        blank=True,
        null=True,
        default=False,
    )

    resume_sharing = models.BooleanField(
        help_text="I consent to IEEE UofT sharing my resume with event sponsors.",
        blank=True,
        null=True,
        default=False,
    )

    rsvp = models.BooleanField(null=True)
    created_at = models.DateTimeField(auto_now_add=True, null=False)
    updated_at = models.DateTimeField(auto_now=True, null=False)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.user.first_name} {self.user.last_name}"
