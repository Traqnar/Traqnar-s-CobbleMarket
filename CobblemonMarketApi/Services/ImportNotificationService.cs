using System.Collections.Concurrent;

namespace CobblemonMarketApi.Services;

public class ImportNotificationService : IImportNotificationService
{
    private readonly ConcurrentDictionary<Guid, Action<string>> _subscribers = new();

    public Guid Subscribe(Action<string> onMessage)
    {
        var id = Guid.NewGuid();
        _subscribers[id] = onMessage;
        return id;
    }

    public void Unsubscribe(Guid subscriptionId)
    {
        _subscribers.TryRemove(subscriptionId, out _);
    }

    public void Publish(string message)
    {
        foreach (var subscriber in _subscribers.Values)
        {
            try
            {
                subscriber(message);
            }
            catch
            {
                // Ignore subscriber errors; SSE connection cleanup is handled by unsubscribe.
            }
        }
    }
}
