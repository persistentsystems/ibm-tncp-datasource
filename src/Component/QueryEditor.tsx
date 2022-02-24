import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { CodeEditor, InlineField, InlineFieldRow, InlineLabel, Select } from '@grafana/ui';
//import { fetchPage } from '@grafana/runtime';
import { find } from 'lodash';
import React, { ComponentType } from 'react';
import AutoSizer from 'react-virtualized-auto-sizer';
import { DataSource } from '../DataSource';

import { GenericOptions, GrafanaQuery } from '../types';
type Props = QueryEditorProps<DataSource, GrafanaQuery, GenericOptions>;

interface LastQuery {
  payload: string;
  resourceType: string;
  metric: string;
}

export const QueryEditor: ComponentType<Props> = ({ datasource, onChange, onRunQuery, query }) => {
  const [resourceType, setResourceType] = React.useState<SelectableValue<string | number>>();
  const [payload, setPayload] = React.useState(query.payload ?? '');
  const [lastQuery, setLastQuery] = React.useState<LastQuery | null>(null) as any;

  const [metricOptions, setMetricOptions] = React.useState<Array<SelectableValue<string | number>>>([]);
  const [isMetricOptionsLoading, setIsMetricOptionsLoading] = React.useState<boolean>(false);

  const [resourceTypeOptions, setResourceTypeOptions] = React.useState<Array<SelectableValue<string | number>>>([]);
  const [isResourceTypesOptionsLoading, setIsResourceTypesOptionsLoading] = React.useState<boolean>(false);

  const [metric, setMetric] = React.useState<SelectableValue<string | number>>();
  const loadResourceTypes = React.useCallback(
    () =>
      datasource.resourceTypeFindQuery({ query: '', format: 'string' }).then(
        (result) => {
          const resourceTypes = result.map((value) => ({ label: value.text, value: value.value }));
          const foundMetric = find(resourceTypes, (resType) => resType.value === query.target);
          setResourceType(foundMetric === undefined ? { label: '', value: '' } : foundMetric);
          return resourceTypes;
        },
        (response) => {
          setResourceType({ label: '', value: '' });
          setResourceTypeOptions([]);

          throw new Error(response.statusText);
        }
      ),
    [datasource, query.target]
  );

  const loadMetrics = React.useCallback(
    () =>
      datasource.metricFindQuery({ query: '', format: 'string' }, resourceType).then(
        (result) => {
          const metrics = result.map((value) => ({ label: value.text, value: value.value }));
          const foundMetric = find(metrics, (metric) => metric.value === query.target);

          setMetric(foundMetric === undefined ? { label: '', value: '' } : foundMetric);
          return metrics;
        },
        (response) => {
          setMetric({ label: '', value: '' });
          setMetricOptions([]);

          throw new Error(response.statusText);
        }
      ),
    [datasource, query.target, resourceType]
  );

  const refreshResourceTypeOptions = React.useCallback(() => {
    setIsResourceTypesOptionsLoading(true);
    loadResourceTypes()
      .then((metrics) => {
        setResourceTypeOptions(metrics);
      })
      .finally(() => {
        setIsResourceTypesOptionsLoading(false);
      });
  }, [loadResourceTypes, setResourceTypeOptions, setIsResourceTypesOptionsLoading]);

  const refreshMetricOptions = React.useCallback(() => {
    setIsMetricOptionsLoading(true);
    loadMetrics()
      .then((metrics) => {
        setMetricOptions(metrics);
      })
      .finally(() => {
        setIsMetricOptionsLoading(false);
      });
  }, [loadMetrics, setMetricOptions, setIsMetricOptionsLoading]);
  // Initializing metric options
  React.useEffect(() => refreshResourceTypeOptions(), []);
  React.useEffect(() => refreshMetricOptions(), []);
  React.useEffect(() => {
    if (resourceType?.value === undefined || resourceType?.value === '') {
      return;
    }

    if (lastQuery !== null && resourceType?.value === lastQuery.metric && payload === lastQuery.payload) {
      return;
    }
    setLastQuery({ payload, metric: resourceType.value.toString() });
    setResourceType(resourceType);
    onChange({ ...query, payload, target: resourceType.value.toString() });
    refreshMetricOptions();
    onRunQuery();
  }, [payload, resourceType]);

  React.useEffect(() => {
    if (metric?.value === undefined || metric?.value === '') {
      return;
    }

    if (lastQuery !== null && metric?.value === lastQuery.metric && payload === lastQuery.payload) {
      return;
    }

    setLastQuery({ payload, metric: metric.value.toString() });
    const recType = resourceType?.value?.toString() + '!';
    const _metric = metric?.value?.toString();
    var expr = recType?.concat(_metric);
    onChange({ ...query, payload, target: expr });
    onRunQuery();
  }, [payload, metric]);

  return (
    <>
      <InlineFieldRow>
        <InlineField>
          <Select
            isLoading={isResourceTypesOptionsLoading}
            prefix="Resource type"
            options={resourceTypeOptions}
            placeholder="Select metric"
            allowCustomValue
            value={resourceType}
            onChange={(v) => {
              setResourceType(v);
            }}
          />
        </InlineField>
        <InlineField>
          <Select
            isLoading={isMetricOptionsLoading}
            prefix="Metric"
            options={metricOptions}
            placeholder="Select metric"
            allowCustomValue
            value={metric}
            onChange={(v) => {
              setMetric(v);
            }}
          />
        </InlineField>
      </InlineFieldRow>
      <InlineFieldRow>
        <AutoSizer disableHeight>
          {({ width }) => (
            <div style={{ width: width + 'px' }}>
              <InlineLabel>Payload</InlineLabel>
              <CodeEditor
                width="100%"
                height="200px"
                language="json"
                showLineNumbers={true}
                showMiniMap={payload.length > 100}
                value={payload}
                onBlur={(value) => setPayload(value)}
              />
            </div>
          )}
        </AutoSizer>
      </InlineFieldRow>
    </>
  );
};
