"""
Transfusion Safety & Hemotherapy Compatibility Engine
Complies with AABB (Association for the Advancement of Blood & Biotherapies) and WHO clinical transfusion standards.
"""

from typing import Dict, Any, List

# RBC Compatibility Matrix: Recipient -> List of compatible Donor blood groups
RBC_COMPATIBILITY = {
    "O-": ["O-"],
    "O+": ["O-", "O+"],
    "A-": ["O-", "A-"],
    "A+": ["O-", "O+", "A-", "A+"],
    "B-": ["O-", "B-"],
    "B+": ["O-", "O+", "B-", "B+"],
    "AB-": ["O-", "A-", "B-", "AB-"],
    "AB+": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"]
}

# Plasma Compatibility Matrix: Recipient -> List of compatible Donor plasma groups
# Note: Plasma compatibility is the reverse of RBC because antibodies are in donor plasma!
PLASMA_COMPATIBILITY = {
    "O-": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
    "O+": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
    "A-": ["A-", "A+", "AB-", "AB+"],
    "A+": ["A-", "A+", "AB-", "AB+"],
    "B-": ["B-", "B+", "AB-", "AB+"],
    "B+": ["B-", "B+", "AB-", "AB+"],
    "AB-": ["AB-", "AB+"],
    "AB+": ["AB-", "AB+"]
}

# Platelets Compatibility Matrix: Identical preferred, compatible secondary
PLATELETS_COMPATIBILITY = {
    "O-": ["O-", "O+"],
    "O+": ["O+", "O-"],
    "A-": ["A-", "A+", "O-", "AB-"],
    "A+": ["A+", "A-", "O+", "AB+"],
    "B-": ["B-", "B+", "O-", "AB-"],
    "B+": ["B+", "B-", "O+", "AB+"],
    "AB-": ["AB-", "AB+", "A-", "B-", "O-"],
    "AB+": ["AB+", "AB-", "A+", "B+", "O+"]
}

def check_compatibility(donor_group: str, recipient_group: str, component_type: str) -> Dict[str, Any]:
    norm_component = component_type.strip().title()
    donor = donor_group.strip().upper()
    recipient = recipient_group.strip().upper()

    # Whole Blood requires strict identical match
    if "Whole" in norm_component:
        is_compatible = (donor == recipient)
        risk = "Safe" if is_compatible else "Fatal Incompatibility / Acute Hemolytic Reaction"
        explanation = (
            f"Whole blood contains both cellular elements and antibodies. "
            f"Transfusion guidelines strictly require exact group matching ({recipient} to {recipient}). "
            f"Donor {donor} with Recipient {recipient} is {'APPROVED' if is_compatible else 'REJECTED: Risk of severe alloantibody hemolysis'}."
        )
        return {
            "compatible": is_compatible,
            "donor_blood_group": donor,
            "recipient_blood_group": recipient,
            "component_type": component_type,
            "clinical_explanation": explanation,
            "transfusion_risk_category": risk,
            "guidelines_reference": "AABB Technical Manual 20th Edition - Whole Blood Transfusion Safety"
        }

    # Red Blood Cells
    elif "Red" in norm_component or "Rbc" in norm_component:
        allowed = RBC_COMPATIBILITY.get(recipient, [])
        is_compatible = donor in allowed
        risk = "Safe" if is_compatible else "Fatal Incompatibility / Acute Hemolytic Transfusion Reaction (AHTR)"
        explanation = (
            f"RBC transfusion check: Recipient {recipient} has circulating antibodies against foreign antigens. "
            f"Compatible donor groups for {recipient} RBCs are: {', '.join(allowed)}. "
            f"Donor unit {donor} is {'COMPATIBLE' if is_compatible else 'INCOMPATIBLE: Anti-A/Anti-B/RhD antibody binding will trigger intravascular hemolysis'}."
        )
        return {
            "compatible": is_compatible,
            "donor_blood_group": donor,
            "recipient_blood_group": recipient,
            "component_type": component_type,
            "clinical_explanation": explanation,
            "transfusion_risk_category": risk,
            "guidelines_reference": "AABB Guidelines for Red Blood Cell Transfusion / Clinical Practice Guidelines"
        }

    # Plasma / Cryoprecipitate
    elif "Plasma" in norm_component or "Cryo" in norm_component:
        allowed = PLASMA_COMPATIBILITY.get(recipient, [])
        is_compatible = donor in allowed
        risk = "Safe" if is_compatible else "High Risk / Immune Hemolysis"
        explanation = (
            f"Plasma transfusion check: Donor plasma contains isohemagglutinins. AB plasma is universal donor. "
            f"Compatible donor plasma for {recipient} recipient includes: {', '.join(allowed)}. "
            f"Donor {donor} plasma is {'COMPATIBLE' if is_compatible else 'INCOMPATIBLE: Donor antibodies will attack recipient erythrocyte antigens'}."
        )
        return {
            "compatible": is_compatible,
            "donor_blood_group": donor,
            "recipient_blood_group": recipient,
            "component_type": component_type,
            "clinical_explanation": explanation,
            "transfusion_risk_category": risk,
            "guidelines_reference": "Circular of Information for the Use of Human Blood and Blood Components"
        }

    # Platelets
    elif "Platelet" in norm_component:
        allowed = PLATELETS_COMPATIBILITY.get(recipient, [])
        is_compatible = donor in allowed
        risk = "Safe" if is_compatible else "Moderate Risk / Refractoriness & Alloimmunization"
        explanation = (
            f"Platelet check: ABO-identical is first choice; compatible ABO acceptable. "
            f"Recipient {recipient} compatible platelet donors: {', '.join(allowed)}. "
            f"Donor {donor} is {'COMPATIBLE' if is_compatible else 'UNMATCHED: Elevated risk of platelet refractoriness'}."
        )
        return {
            "compatible": is_compatible,
            "donor_blood_group": donor,
            "recipient_blood_group": recipient,
            "component_type": component_type,
            "clinical_explanation": explanation,
            "transfusion_risk_category": risk,
            "guidelines_reference": "WHO Guidelines on Clinical Use of Blood / Platelet Transfusions"
        }

    # Default fallback
    is_compatible = (donor == recipient)
    return {
        "compatible": is_compatible,
        "donor_blood_group": donor,
        "recipient_blood_group": recipient,
        "component_type": component_type,
        "clinical_explanation": f"Exact ABO/Rh match check for {component_type}.",
        "transfusion_risk_category": "Safe" if is_compatible else "Unverified Protocol",
        "guidelines_reference": "Standard Hospital Laboratory Verification Policy"
    }
