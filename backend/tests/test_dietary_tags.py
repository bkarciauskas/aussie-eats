from app.domain.dietary import (
    coerce_tag_list,
    item_matches_diets,
    parse_dietary_tags,
    restaurant_matches_diets,
    tags_for_storage,
)
from app.domain.search import parse_cuisine_tags
from app.mongo_util import normalize_tags_for_api


def test_coerce_tag_list_accepts_string_and_list():
    assert coerce_tag_list('["vegan","halal"]') == ["vegan", "halal"]
    assert coerce_tag_list(["vegan", "halal"]) == ["vegan", "halal"]
    assert coerce_tag_list(None) == []


def test_parse_dietary_tags_filters_unknown():
    assert parse_dietary_tags(["vegan", "keto"]) == ["vegan"]
    assert parse_dietary_tags('["vegetarian"]') == ["vegetarian"]


def test_parse_cuisine_tags_dual_read():
    assert parse_cuisine_tags(["Thai", "Noodles"]) == ["Thai", "Noodles"]
    assert parse_cuisine_tags('["Thai"]') == ["Thai"]
    assert parse_cuisine_tags("Thai, Noodles") == ["Thai", "Noodles"]


def test_item_and_restaurant_matches_diets():
    vegan_item = {"dietaryTags": ["vegan", "vegetarian", "nut-free"], "allergens": []}
    plain_item = {"dietaryTags": "[]", "allergens": "[]"}
    assert item_matches_diets(vegan_item, ["vegan", "nut-free"]) is True
    assert item_matches_diets(plain_item, ["nut-free"]) is False
    assert restaurant_matches_diets([plain_item, vegan_item], ["vegan"]) is True
    assert restaurant_matches_diets([plain_item], ["vegan"]) is False


def test_normalize_tags_for_api_stringifies_lists():
    doc = normalize_tags_for_api(
        {
            "cuisineTags": ["Burgers"],
            "dietaryTags": ["vegetarian"],
            "allergens": [],
        }
    )
    assert doc["cuisineTags"] == '["Burgers"]'
    assert doc["dietaryTags"] == '["vegetarian"]'
    assert doc["allergens"] == "[]"
    assert tags_for_storage(["vegan"]) == ["vegan"]
