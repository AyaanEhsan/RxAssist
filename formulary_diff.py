from supabase import create_client, Client


from models.tierchange import TierChange




def get_tier_changes(supabase: Client, formulary_id: str, rxcui: str, initial_date: str, final_date: str):
    """
    Identifies if the tier_level_value changed for a specific RXCUI 
    between two dates and returns both values if they differ.
    """
    try:
        # Fetching records for both dates in a single call or sequential calls
        # We filter by rxcui and the two specific dates
        response = supabase.table("formulary") \
            .select("data_date, tier_level_value, ndc") \
            .eq("rxcui", rxcui) \
            .eq("formulary_id", formulary_id) \
            .in_("data_date", [initial_date, final_date]) \
            .execute()

        data = response.data
        if not data:
            return "No records found for this RXCUI on the provided dates."

        # Group data by date for comparison
        initial_records = [d for d in data if d['data_date'] == initial_date]
        final_records = [d for d in data if d['data_date'] == final_date]

        changes = []

        # Compare based on unique identifiers (formulary_id + ndc) 
        # to ensure we aren't comparing two different plans
        for row_i in initial_records:
            for row_f in final_records:
                val_initial = row_i['tier_level_value']
                val_final = row_f['tier_level_value']
                
                if val_initial != val_final:
                    changes.append(TierChange(
                        rxcui= rxcui,
                        ndc= row_i['ndc'],
                        has_tier_changed= True,
                        tier_before= val_initial,
                        tier_after= val_final
                    ))
                else:
                    changes.append(TierChange(
                        rxcui= rxcui,
                        ndc= row_i['ndc'],
                        has_tier_changed= False,
                        tier_before= val_initial,
                        tier_after= val_final
                    ))

        return changes

    except Exception as e:
        return {"error": str(e)}