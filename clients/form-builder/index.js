import {
	FormBuilder,
	ProcessorsContext,
	ProcessorsProvider,
	ConditionalsContext,
	ConditionalsProvider,
	MagicTagProvider,
	prepareProcessorsForSave,
	prepareConditionalsForSave,
	RenderViaPortal,
} from "@calderajs/form-builder";
import { Button } from "@wordpress/components";

import React from "react";
import { render } from "@wordpress/element";
import domReady from "@wordpress/dom-ready";
import apiFetch from "@wordpress/api-fetch";

/**
 * Deals with saving forms
 *
 * Including the save button and API interactions
 *
 * @since 1.9.0
 *
 */
const HandleSave = ({ jQuery, formId }) => {
	//Get conditionals
	const { conditionals, hasConditionals } = React.useContext(
		ConditionalsContext
	);
	//Get processors
	const { processors, hasProcessors } = React.useContext(ProcessorsContext);
	//Track if we're saving or not
	const [isSaving, setIsSaving] = React.useState(false);

	//Save handler
	const onSave = () => {
		setIsSaving(true);
		if (typeof window.tinyMCE !== "undefined") {
			window.tinyMCE.triggerSave();
		}

		//Get data from outside of app
		let data_fields = jQuery(".caldera-forms-options-form").formJSON();

		//Legacy hook
		jQuery(document).trigger("cf.presave", {
			config: data_fields.config,
		});

		if (hasConditionals) {
			data_fields.config.conditional_groups = {
				conditions: (data_fields.conditions = prepareConditionalsForSave(
					conditionals
				)),
			};
		} else {
			data_fields.config.conditional_groups = {};
		}

		if (hasProcessors) {
			data_fields.config.processors = prepareProcessorsForSave(processors);
		} else {
			data_fields.config.processors = {};
		}

		//Clear all assignments of fields to conditonals
		if (data_fields.config.hasOwnProperty("fields")) {
			Object.keys(data_fields.config.fields).forEach((fieldId) => {
				if (data_fields.config.fields.hasOwnProperty(fieldId)) {
					data_fields.config.fields[fieldId].conditions = {
						type: "",
					};
				}
			});
		}

		//Reset assignments of fields to conditonals
		conditionals.forEach((c) => {
			const appliesTo = c.hasOwnProperty("config") ? c.config.appliesTo : [];
			if (appliesTo) {
				appliesTo.forEach((fieldId) => {
					if (data_fields.config.fields.hasOwnProperty(fieldId)) {
						data_fields.config.fields[fieldId].conditions = {
							type: c.id,
						};
					}
				});
			}
		});

		apiFetch({
			path: `/cf-api/v2/forms/${formId}`,
			data: {
				...data_fields,
			},
			method: "PUT",
		})
			.then(({ form_id, form }) => {
				const $notice = jQuery(".updated_notice_box");
				$notice.stop().animate({ top: 0 }, 200, function () {
					setTimeout(function () {
						$notice.stop().animate({ top: -75 }, 700);
					}, 1700);
				});
			})
			.catch((e) => console.log(e))
			.finally(() => {
				window.setTimeout(() => {
					setIsSaving(false);
				}, 2000);
			});
	};

	React.useEffect(() => {
		conditionals.forEach(conditional => {
			console.log(conditional);
		})
	},[conditionals]);
	return (
		<Button
			isPrimary
			isBusy={isSaving}
			className="button button-primary caldera-header-save-button"
			type="button"
			onClick={onSave}
		>
			{!isSaving ? "Save Form" : "Saving"}
		</Button>
	);
};

/**
 * Caldera Forms Form Builder React App
 *
 * @since 2.0.0
 */
const CalderaFormsBuilder = ({ savedForm, jQuery, conditionalsNode }) => {
	const savedProcessors = savedForm.hasOwnProperty("processors")
		? savedForm.processors
		: {};
	const saveNode = document.getElementById("caldera-header-save-button");
	return (
		<MagicTagProvider systemValues={window.system_values || {}}>
			<ProcessorsProvider savedProcessors={savedProcessors} jQuery={jQuery}>
				<ConditionalsProvider savedForm={savedForm}>
					<RenderViaPortal domNode={saveNode}>
						<HandleSave jQuery={jQuery} formId={savedForm.ID} />
					</RenderViaPortal>
					<FormBuilder
						jQuery={jQuery}
						conditionalsNode={conditionalsNode}
						form={savedForm}
						strings={
							window.CF_FORM_BUILDER
								? window.CF_FORM_BUILDER.strings
								: undefined
						}
					/>
				</ConditionalsProvider>
			</ProcessorsProvider>
		</MagicTagProvider>
	);
};

/**
 * Initialize form builder
 *
 * @since 1.9.0
 */
domReady(function () {
	let form = CF_ADMIN.form;
	if (!form.hasOwnProperty("fields")) {
		form.fields = {};
	}

	const conditionalsNode = document.getElementById(
		"caldera-forms-conditions-panel"
	);

	render(
		<CalderaFormsBuilder
			savedForm={form}
			conditionalsNode={conditionalsNode}
			jQuery={window.jQuery}
		/>,
		document.getElementById("caldera-forms-form-builder")
	);
});
